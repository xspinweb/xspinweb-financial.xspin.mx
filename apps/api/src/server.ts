import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { calculateInitialInvestment, generateInvestorCode } from "./business/rules.js";
import { config } from "./config.js";
import { prisma } from "./db.js";

const createInvestmentSchema = z.object({
  amount: z.number().min(20).max(2000),
  email: z.string().email(),
  fullName: z.string().optional(),
  referredByCode: z.string().optional(),
  sourceInvestmentId: z.string().optional()
});

type PortfolioInvestment = {
  id: string;
  principalAmount: unknown;
  group: { groupNumber: number };
  cycleNumber: number;
  createdAt: Date;
  paymentDueAt: Date;
  referralsSource: Array<{
    createdAt: Date;
    bonusAmount: unknown;
    referredInvestor: {
      fullName: string | null;
      investments: Array<{
        createdAt: Date;
        principalAmount: unknown;
      }>;
    };
  }>;
};

const server = createServer(async (req, res) => {
  try {
    await handleRequest(req, res);
  } catch (error) {
    sendJson(res, error instanceof Error ? 400 : 500, {
      error: error instanceof Error ? error.message : "Error interno"
    });
  }
});

server.listen(config.port, () => {
  console.log(`Pay Financial API running on http://localhost:${config.port}`);
});

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", "http://localhost");

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, {
      ok: true,
      service: "pay-financial-api"
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/dashboard") {
    const [activeInvestors, totalInvestors, activeInvestments, totalPaid, totalPrincipal] = await Promise.all([
      prisma.investor.count({ where: { status: "ACTIVE" } }),
      prisma.investor.count(),
      prisma.investment.count({ where: { status: "ACTIVE" } }),
      prisma.payment.aggregate({ _sum: { amount: true } }),
      prisma.investment.aggregate({ _sum: { principalAmount: true } })
    ]);

    sendJson(res, 200, {
      activeInvestors,
      totalInvestors,
      activeInvestments,
      totalPaid: Number(totalPaid._sum.amount ?? 0),
      totalPrincipal: Number(totalPrincipal._sum.principalAmount ?? 0)
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/investments/portfolio") {
    const email = z.string().email().parse(url.searchParams.get("email"));
    const portfolio = await getPortfolio(email);
    sendJson(res, 200, portfolio);
    return;
  }

  if (req.method === "POST" && url.pathname === "/investments") {
    const input = createInvestmentSchema.parse(await readJson(req));
    const result = await createInvestment(input);
    sendJson(res, 201, result);
    return;
  }

  if (req.method === "GET" && url.pathname === "/investments/due") {
    const investments = await prisma.investment.findMany({
      where: {
        status: "ACTIVE",
        paymentDueAt: {
          lte: new Date()
        }
      },
      include: {
        group: true,
        investor: true
      },
      orderBy: { paymentDueAt: "asc" }
    });

    sendJson(res, 200, investments);
    return;
  }

  sendJson(res, 404, {
    error: "Ruta no encontrada"
  });
}

async function getPortfolio(email: string) {
  const investor = await prisma.investor.findFirst({
    where: { email },
    include: {
      investments: {
        include: {
          group: true,
          referralsSource: {
            include: {
              referredInvestor: {
                include: {
                  investments: {
                    orderBy: { createdAt: "desc" },
                    take: 1
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!investor) {
    return {
      investor: null,
      investments: []
    };
  }

  const investments = investor.investments as PortfolioInvestment[];

  return {
    investor: {
      id: investor.id,
      code: investor.investorCode,
      email: investor.email,
      name: investor.fullName
    },
    investments: investments.map((investment: PortfolioInvestment) => ({
      id: investment.id,
      name: investor.fullName,
      amount: Number(investment.principalAmount),
      group: `Grupo ${investment.group.groupNumber}`,
      cycle: `Semana ${investment.cycleNumber} de 12`,
      investedAt: investment.createdAt,
      nextPaymentAt: investment.paymentDueAt,
      referrals: investment.referralsSource.map((referral: PortfolioInvestment["referralsSource"][number]) => {
        const referredInvestment = referral.referredInvestor.investments[0];

        return {
          name: referral.referredInvestor.fullName,
          invested: Boolean(referredInvestment),
          investedAt: referredInvestment?.createdAt ?? referral.createdAt,
          amount: referredInvestment ? Number(referredInvestment.principalAmount) : 0,
          bonusAmount: Number(referral.bonusAmount)
        };
      })
    }))
  };
}

async function createInvestment(input: z.infer<typeof createInvestmentSchema>) {
  const rules = config.defaultBusinessRules;

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const group = await getOrCreateOpenGroup(tx, rules.groupSize);
    const investor = await getOrCreateInvestor(tx, {
      email: input.email,
      fullName: input.fullName
    });
    const calculated = calculateInitialInvestment(input.amount, rules);
    const latestInvestment = await tx.investment.findFirst({
      where: { investorId: investor.id },
      orderBy: { cycleNumber: "desc" }
    });

    const investment = await tx.investment.create({
      data: {
        investorId: investor.id,
        groupId: group.id,
        cycleNumber: (latestInvestment?.cycleNumber ?? 0) + 1,
        principalAmount: calculated.principalAmount,
        returnAmount: calculated.returnAmount,
        referralBonusAmount: calculated.referralBonusAmount,
        expectedPaymentAmount: calculated.expectedPaymentAmount,
        paymentDueAt: calculated.paymentDueAt
      },
      include: {
        group: true
      }
    });

    if (input.referredByCode && input.sourceInvestmentId) {
      const referrer = await tx.investor.findUnique({
        where: { investorCode: input.referredByCode }
      });
      const sourceInvestment = referrer
        ? await tx.investment.findFirst({
            where: {
              id: input.sourceInvestmentId,
              investorId: referrer.id
            }
          })
        : null;

      if (referrer && sourceInvestment && referrer.id !== investor.id) {
        await tx.referral.create({
          data: {
            referrerInvestorId: referrer.id,
            referredInvestorId: investor.id,
            sourceInvestmentId: sourceInvestment.id,
            bonusAmount: calculated.referralBonusAmount
          }
        });
      }
    }

    return { investor, investment };
  });
}

async function getOrCreateInvestor(tx: Prisma.TransactionClient, input: { email: string; fullName?: string }) {
  const current = await tx.investor.findFirst({
    where: { email: input.email }
  });

  if (current) {
    return current;
  }

  return tx.investor.create({
    data: {
      investorCode: await createUniqueInvestorCode(tx),
      fullName: input.fullName,
      email: input.email
    }
  });
}

async function getOrCreateOpenGroup(tx: Prisma.TransactionClient, groupSize: number) {
  const current = await tx.investmentGroup.findFirst({
    where: { status: "OPEN" },
    orderBy: { groupNumber: "desc" }
  });

  if (current) {
    const investorsInGroup = await tx.investment.findMany({
      where: { groupId: current.id },
      select: { investorId: true },
      distinct: ["investorId"]
    });

    if (investorsInGroup.length < groupSize) {
      return current;
    }

    await tx.investmentGroup.update({
      where: { id: current.id },
      data: { status: "CLOSED", closedAt: new Date() }
    });
  }

  const latest = await tx.investmentGroup.findFirst({
    orderBy: { groupNumber: "desc" }
  });

  return tx.investmentGroup.create({
    data: {
      groupNumber: (latest?.groupNumber ?? 0) + 1
    }
  });
}

async function createUniqueInvestorCode(tx: Prisma.TransactionClient) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const investorCode = generateInvestorCode();
    const existing = await tx.investor.findUnique({ where: { investorCode } });

    if (!existing) {
      return investorCode;
    }
  }

  throw new Error("No se pudo generar un codigo unico de inversionista");
}

async function readJson(req: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const body = Buffer.concat(chunks).toString("utf8");
  return body ? JSON.parse(body) : {};
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json"
  });
  res.end(JSON.stringify(payload));
}

function setCorsHeaders(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}
