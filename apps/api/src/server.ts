import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { addDays, calculateInitialInvestment, generateInvestorCode, roundMoney } from "./business/rules.js";
import { config } from "./config.js";
import { prisma } from "./db.js";

const createInvestmentSchema = z.object({
  amount: z.number().min(20).max(2000),
  email: z.string().email(),
  fullName: z.string().optional(),
  referredByCode: z.string().optional(),
  sourceInvestmentId: z.string().optional()
});

const checkoutConfirmSchema = z.object({
  sessionId: z.string().min(1)
});

const reinvestSchema = z.object({
  reinvestPercent: z.number().min(82).max(100),
  weekNumber: z.number().int().min(1).max(config.defaultBusinessRules.totalCycleWeeks).optional()
});

const payoutMethodSchema = z.object({
  accountHolder: z.string().optional(),
  bankName: z.string().optional(),
  clabe: z.string().optional(),
  coin: z.string().optional(),
  email: z.string().email(),
  isPrimary: z.boolean().optional(),
  paxumAccount: z.string().optional(),
  payoutEmail: z.string().email().optional(),
  type: z.enum(["BANK", "PAYPAL", "PAXUM", "CRYPTO"]),
  walletAddress: z.string().optional()
});

const primaryPayoutMethodSchema = z.object({
  email: z.string().email()
});

const deletePayoutMethodSchema = z.object({
  email: z.string().email()
});

type PortfolioInvestment = {
  id: string;
  principalAmount: unknown;
  group: { groupNumber: number };
  cycleNumber: number;
  createdAt: Date;
  paymentDueAt: Date;
  payments: Array<{
    id: string;
    amount: unknown;
    notes: string | null;
    paidAt: Date;
  }>;
  referralsSource: Array<{
    createdAt: Date;
    bonusAmount: unknown;
    referredInvestor: {
      fullName: string | null;
      investments: Array<{
        createdAt: Date;
        principalAmount: unknown;
        payments: Array<{
          notes: string | null;
          paidAt: Date;
        }>;
      }>;
    };
  }>;
};

type WeeklyInvestmentInput = {
  createdAt: Date;
  principalAmount: unknown;
  payments: Array<{
    notes: string | null;
    paidAt: Date;
  }>;
  referralsSource: Array<{
    referredInvestor: {
      investments: Array<{
        principalAmount: unknown;
        payments: Array<{
          notes: string | null;
          paidAt: Date;
        }>;
      }>;
    };
  }>;
};

type ReinvestReferral = {
  bonusAmount: unknown;
  referredInvestor: {
    investments: Array<{
      principalAmount: unknown;
      payments: Array<{
        notes: string | null;
        paidAt: Date;
      }>;
    }>;
  };
};

type StripeCheckoutSession = {
  id: string;
  metadata?: Record<string, string | undefined>;
  payment_status?: string;
  status?: string;
  url?: string;
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

  if (req.method === "GET" && url.pathname === "/payout-methods") {
    const email = z.string().email().parse(url.searchParams.get("email"));
    const methods = await getPayoutMethods(email);
    sendJson(res, 200, methods);
    return;
  }

  if (req.method === "POST" && url.pathname === "/payout-methods") {
    const input = payoutMethodSchema.parse(await readJson(req));
    const method = await createPayoutMethod(input);
    sendJson(res, 201, method);
    return;
  }

  if (req.method === "POST" && url.pathname === "/investments") {
    const input = createInvestmentSchema.parse(await readJson(req));
    await assertReferralTargetOpen(input.referredByCode, input.sourceInvestmentId);
    const result = await createInvestment(input);
    sendJson(res, 201, result);
    return;
  }

  if (req.method === "POST" && url.pathname === "/checkout/investment") {
    const input = createInvestmentSchema.parse(await readJson(req));
    await assertReferralTargetOpen(input.referredByCode, input.sourceInvestmentId);
    const result = await createStripeInvestmentCheckout(input);
    sendJson(res, 201, result);
    return;
  }

  if (req.method === "POST" && url.pathname === "/checkout/confirm") {
    const input = checkoutConfirmSchema.parse(await readJson(req));
    const result = await confirmStripeInvestmentCheckout(input.sessionId);
    sendJson(res, 201, result);
    return;
  }

  const reinvestMatch = url.pathname.match(/^\/investments\/([^/]+)\/reinvest$/);
  const primaryPayoutMethodMatch = url.pathname.match(/^\/payout-methods\/([^/]+)\/primary$/);
  const payoutMethodMatch = url.pathname.match(/^\/payout-methods\/([^/]+)$/);

  if (req.method === "POST" && primaryPayoutMethodMatch) {
    const input = primaryPayoutMethodSchema.parse(await readJson(req));
    const method = await setPrimaryPayoutMethod(primaryPayoutMethodMatch[1], input.email);
    sendJson(res, 200, method);
    return;
  }

  if (req.method === "DELETE" && payoutMethodMatch) {
    const input = deletePayoutMethodSchema.parse(await readJson(req));
    const result = await deletePayoutMethod(payoutMethodMatch[1], input.email);
    sendJson(res, 200, result);
    return;
  }

  if (req.method === "POST" && reinvestMatch) {
    const input = reinvestSchema.parse(await readJson(req));
    const result = await reinvestInvestment(reinvestMatch[1], input);
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
                    include: {
                      payments: {
                        orderBy: { paidAt: "asc" },
                        select: {
                          notes: true,
                          paidAt: true
                        }
                      }
                    },
                    orderBy: { createdAt: "desc" },
                    take: 1
                  }
                }
              }
            }
          },
          payments: {
            orderBy: { paidAt: "asc" },
            select: {
              id: true,
              amount: true,
              notes: true,
              paidAt: true
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
      cycle: `Semana ${investment.cycleNumber} de ${config.defaultBusinessRules.totalCycleWeeks}`,
      investedAt: investment.createdAt,
      nextPaymentAt: investment.paymentDueAt,
      paidWeeks: investment.payments.length,
      weeks: buildInvestmentWeeks(investment),
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

async function getPayoutMethods(email: string) {
  const investor = await prisma.investor.findFirst({
    include: {
      payoutMethods: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }]
      }
    },
    where: { email }
  });

  if (!investor) {
    return [];
  }

  return investor.payoutMethods.map(formatPayoutMethod);
}

async function createPayoutMethod(input: z.infer<typeof payoutMethodSchema>) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const investor = await getOrCreateInvestor(tx, {
      email: input.email
    });
    const existingMethods = await tx.payoutMethod.count({
      where: { investorId: investor.id }
    });
    const isPrimary = input.isPrimary || existingMethods === 0;

    if (isPrimary) {
      await tx.payoutMethod.updateMany({
        data: { isPrimary: false },
        where: { investorId: investor.id }
      });
    }

    const method = await tx.payoutMethod.create({
      data: {
        accountHolder: cleanOptional(input.accountHolder),
        bankName: cleanOptional(input.bankName),
        clabe: cleanOptional(input.clabe),
        coin: cleanOptional(input.coin),
        email: cleanOptional(input.payoutEmail),
        investorId: investor.id,
        isPrimary,
        paxumAccount: cleanOptional(input.paxumAccount),
        type: input.type,
        walletAddress: cleanOptional(input.walletAddress)
      }
    });

    return formatPayoutMethod(method);
  });
}

async function setPrimaryPayoutMethod(methodId: string, email: string) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const investor = await tx.investor.findFirst({
      select: { id: true },
      where: { email }
    });

    if (!investor) {
      throw new Error("No se encontro el inversionista.");
    }

    const method = await tx.payoutMethod.findFirst({
      where: {
        id: methodId,
        investorId: investor.id
      }
    });

    if (!method) {
      throw new Error("No se encontro el metodo de pago.");
    }

    await tx.payoutMethod.updateMany({
      data: { isPrimary: false },
      where: { investorId: investor.id }
    });

    const updated = await tx.payoutMethod.update({
      data: { isPrimary: true },
      where: { id: method.id }
    });

    return formatPayoutMethod(updated);
  });
}

async function deletePayoutMethod(methodId: string, email: string) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const investor = await tx.investor.findFirst({
      select: { id: true },
      where: { email }
    });

    if (!investor) {
      throw new Error("No se encontro el inversionista.");
    }

    const method = await tx.payoutMethod.findFirst({
      where: {
        id: methodId,
        investorId: investor.id
      }
    });

    if (!method) {
      throw new Error("No se encontro el metodo de pago.");
    }

    await tx.payoutMethod.delete({
      where: { id: method.id }
    });

    if (method.isPrimary) {
      const nextMethod = await tx.payoutMethod.findFirst({
        orderBy: { createdAt: "asc" },
        where: { investorId: investor.id }
      });

      if (nextMethod) {
        await tx.payoutMethod.update({
          data: { isPrimary: true },
          where: { id: nextMethod.id }
        });
      }
    }

    return { ok: true };
  });
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

    const referralTarget = parseReferralTarget(input.referredByCode, input.sourceInvestmentId);

    if (referralTarget.referredByCode && referralTarget.sourceInvestmentId) {
      const referrer = await tx.investor.findUnique({
        where: { investorCode: referralTarget.referredByCode }
      });
      const sourceInvestment = referrer
        ? await tx.investment.findFirst({
            where: {
              id: referralTarget.sourceInvestmentId,
              investorId: referrer.id
            },
            include: {
              payments: {
                select: { id: true },
                take: 1
              }
            }
          })
        : null;
      const sourceAcceptsReferrals = sourceInvestment ? sourceInvestment.payments.length === 0 : false;

      if (referrer && sourceInvestment && sourceAcceptsReferrals && referrer.id !== investor.id) {
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

async function assertReferralTargetOpen(referredByCode?: string, sourceInvestmentId?: string) {
  const referralTarget = parseReferralTarget(referredByCode, sourceInvestmentId);

  if (!referralTarget.referredByCode || !referralTarget.sourceInvestmentId) {
    return;
  }

  const referrer = await prisma.investor.findUnique({
    select: { id: true },
    where: { investorCode: referralTarget.referredByCode }
  });

  if (!referrer) {
    return;
  }

  const sourceInvestment = await prisma.investment.findFirst({
    include: {
      payments: {
        select: { id: true },
        take: 1
      }
    },
    where: {
      id: referralTarget.sourceInvestmentId,
      investorId: referrer.id
    }
  });

  if (sourceInvestment?.payments.length) {
    throw new Error("Este grupo ya no acepta referidos porque la primera semana ya fue cobrada.");
  }
}

async function createStripeInvestmentCheckout(input: z.infer<typeof createInvestmentSchema>) {
  if (!config.stripeSecretKey) {
    throw new Error("Stripe no esta configurado en el servidor.");
  }

  const session = await stripeRequest<StripeCheckoutSession>("checkout/sessions", {
    "mode": "payment",
    "payment_method_types[0]": "card",
    "customer_email": input.email,
    "success_url": `${config.appUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    "cancel_url": `${config.appUrl}/dashboard?checkout=cancelled`,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "mxn",
    "line_items[0][price_data][unit_amount]": String(Math.round(input.amount * 100)),
    "line_items[0][price_data][product_data][name]": "Inversion Pay Financial",
    "line_items[0][price_data][product_data][description]": "Registro de inversion en modo pruebas",
    "metadata[amount]": String(input.amount),
    "metadata[email]": input.email,
    "metadata[fullName]": input.fullName ?? "",
    "metadata[referredByCode]": input.referredByCode ?? "",
    "metadata[sourceInvestmentId]": input.sourceInvestmentId ?? ""
  });

  if (!session.url) {
    throw new Error("Stripe no regreso una URL de pago.");
  }

  return {
    sessionId: session.id,
    url: session.url
  };
}

async function confirmStripeInvestmentCheckout(sessionId: string) {
  if (!config.stripeSecretKey) {
    throw new Error("Stripe no esta configurado en el servidor.");
  }

  const existingPayment = await prisma.payment.findFirst({
    where: {
      notes: {
        contains: getStripePaymentNote(sessionId)
      }
    },
    select: {
      investmentId: true
    }
  });

  if (existingPayment) {
    return {
      alreadyProcessed: true,
      investmentId: existingPayment.investmentId
    };
  }

  const session = await stripeRequest<StripeCheckoutSession>(`checkout/sessions/${encodeURIComponent(sessionId)}`, undefined, "GET");

  if (session.payment_status !== "paid" && session.status !== "complete") {
    throw new Error("El pago aun no esta confirmado por Stripe.");
  }

  const metadata = session.metadata ?? {};
  const amount = Number(metadata.amount);

  const input = createInvestmentSchema.parse({
    amount,
    email: metadata.email,
    fullName: metadata.fullName || undefined,
    referredByCode: metadata.referredByCode || undefined,
    sourceInvestmentId: metadata.sourceInvestmentId || undefined
  });
  const result = await createInvestment(input);

  await prisma.payment.create({
    data: {
      investorId: result.investor.id,
      groupId: result.investment.groupId,
      amount: input.amount,
      paymentType: "ADJUSTMENT",
      notes: `${getStripePaymentNote(sessionId)} inversion confirmada`
    }
  });

  return {
    alreadyProcessed: false,
    investmentId: result.investment.id
  };
}

async function reinvestInvestment(investmentId: string, input: z.infer<typeof reinvestSchema>) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const investment = await tx.investment.findUniqueOrThrow({
      where: { id: investmentId },
      include: {
        payments: {
          orderBy: { paidAt: "asc" },
          select: {
            notes: true,
            paidAt: true
          }
        },
        referralsSource: {
          include: {
            referredInvestor: {
              include: {
                  investments: {
                    include: {
                      payments: {
                        orderBy: { paidAt: "asc" },
                        select: {
                          notes: true,
                          paidAt: true
                        }
                      }
                    },
                    orderBy: { createdAt: "desc" },
                    take: 1
                  }
              }
            }
          }
        }
      }
    });
    const paidWeeks = investment.payments.length;
    const weekNumber = input.weekNumber ?? paidWeeks + 1;

    if (weekNumber !== paidWeeks + 1) {
      throw new Error("La semana seleccionada no esta disponible para reinversion.");
    }

    const referrals = investment.referralsSource as ReinvestReferral[];
    const confirmedReferrals = referrals.filter((referral: ReinvestReferral) => Boolean(referral.referredInvestor.investments[0])).length;
    const paymentDate = addDays(investment.createdAt, weekNumber * config.defaultBusinessRules.cycleDays);

    if (paidWeeks >= config.defaultBusinessRules.totalCycleWeeks) {
      throw new Error(`Esta inversion ya concluyo sus ${config.defaultBusinessRules.totalCycleWeeks} semanas.`);
    }

    if (weekNumber >= config.defaultBusinessRules.totalCycleWeeks) {
      throw new Error(`La semana ${config.defaultBusinessRules.totalCycleWeeks} es cierre final y no permite reinversion.`);
    }

    if (confirmedReferrals < 2) {
      throw new Error("La reinversion requiere al menos 2 referidos confirmados.");
    }

    if (new Date() < paymentDate) {
      throw new Error("La fecha de pago de esta semana aun no ha llegado.");
    }

    const week = buildInvestmentWeeks(investment)[weekNumber - 1];

    if (!week || week.baseAmount <= 0) {
      throw new Error("Esta semana no tiene capital base para reinversion.");
    }

    if (!week.canCollect) {
      throw new Error("Esta semana requiere al menos 2 referidos con reinversion confirmada.");
    }

    const totalGenerated = week.totalGenerated;
    const reinvestedAmount = roundMoney(totalGenerated * (input.reinvestPercent / 100));
    const withdrawalAmount = roundMoney(totalGenerated - reinvestedAmount);

    const payment = await tx.payment.create({
      data: {
        investorId: investment.investorId,
        investmentId: investment.id,
        groupId: investment.groupId,
        amount: withdrawalAmount,
        paymentType: "YIELD",
        notes: `Semana ${weekNumber}: reinversion ${input.reinvestPercent}%, reinvertido ${reinvestedAmount}, retiro ${withdrawalAmount}`
      }
    });

    return {
      payment,
      reinvestedAmount,
      totalGenerated,
      withdrawalAmount,
      weekNumber
    };
  });
}

function getTotalGenerated(input: { principalAmount: number; referrals: Array<{ bonusAmount: number; referredAmount: number }> }) {
  const referralBonus = roundMoney(input.referrals.reduce((total, referral) => total + referral.bonusAmount, 0));
  const referralYield = roundMoney(input.referrals.reduce((total, referral) => total + referral.referredAmount * config.defaultBusinessRules.referralYieldRate, 0));

  return roundMoney(input.principalAmount + referralBonus + referralYield);
}

function buildInvestmentWeeks(investment: WeeklyInvestmentInput) {
  const paidWeeks = investment.payments.length;
  const visibleWeeks = Math.min(config.defaultBusinessRules.totalCycleWeeks, Math.max(1, paidWeeks + 1));

  return Array.from({ length: visibleWeeks }, (_, index) => {
    const weekNumber = index + 1;
    const baseAmount =
      weekNumber === 1 ? Number(investment.principalAmount) : getReinvestedAmount(investment.payments[weekNumber - 2]?.notes);
    const weeklyReferralAmounts = investment.referralsSource.map((referral) => {
      const referredInvestment = referral.referredInvestor.investments[0];

      if (!referredInvestment) {
        return 0;
      }

      if (weekNumber === 1) {
        return Number(referredInvestment.principalAmount);
      }

      return getReinvestedAmount(referredInvestment.payments[weekNumber - 2]?.notes);
    });
    const weeklyQualifiedReferrals = weeklyReferralAmounts.filter((amount) => amount > 0).length;
    const weeklyBonus = roundMoney(weeklyReferralAmounts.reduce((total, amount) => total + amount * config.defaultBusinessRules.referralBonusRate, 0));
    const weeklyYield = roundMoney(weeklyReferralAmounts.reduce((total, amount) => total + amount * config.defaultBusinessRules.referralYieldRate, 0));
    const totalGenerated = roundMoney(baseAmount + weeklyBonus + weeklyYield);

    return {
      baseAmount,
      canCollect: baseAmount > 0 && weeklyQualifiedReferrals >= 2,
      paymentAt: addDays(investment.createdAt, weekNumber * config.defaultBusinessRules.cycleDays),
      startAt: addDays(investment.createdAt, (weekNumber - 1) * config.defaultBusinessRules.cycleDays),
      totalGenerated,
      weeklyBonus,
      weeklyQualifiedReferrals,
      weeklyYield,
      weekNumber
    };
  });
}

function getReinvestedAmount(notes?: string | null) {
  const match = notes?.match(/reinvertido\s+([0-9]+(?:\.[0-9]+)?)/i);
  return match ? Number(match[1]) : 0;
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

function parseReferralTarget(referredByCode?: string, sourceInvestmentId?: string) {
  if (!referredByCode) {
    return { referredByCode, sourceInvestmentId };
  }

  const [investorCode, embeddedInvestmentId] = referredByCode.split(/-(.+)/);

  return {
    referredByCode: investorCode,
    sourceInvestmentId: sourceInvestmentId ?? embeddedInvestmentId
  };
}

function getStripePaymentNote(sessionId: string) {
  return `stripe_checkout_session:${sessionId}`;
}

function formatPayoutMethod(method: {
  accountHolder: string | null;
  bankName: string | null;
  clabe: string | null;
  coin: string | null;
  createdAt: Date;
  email: string | null;
  id: string;
  isPrimary: boolean;
  paxumAccount: string | null;
  type: "BANK" | "PAYPAL" | "PAXUM" | "CRYPTO";
  walletAddress: string | null;
}) {
  return {
    accountHolder: method.accountHolder ?? undefined,
    bankName: method.bankName ?? undefined,
    clabe: method.clabe ?? undefined,
    coin: method.coin ?? undefined,
    createdAt: method.createdAt,
    email: method.email ?? undefined,
    id: method.id,
    isPrimary: method.isPrimary,
    paxumAccount: method.paxumAccount ?? undefined,
    type: method.type.toLowerCase(),
    walletAddress: method.walletAddress ?? undefined
  };
}

function cleanOptional(value?: string) {
  const clean = value?.trim();
  return clean ? clean : undefined;
}

async function stripeRequest<T>(path: string, payload?: Record<string, string>, method: "GET" | "POST" = "POST") {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    body: method === "POST" ? new URLSearchParams(payload) : undefined,
    headers: {
      Authorization: `Bearer ${config.stripeSecretKey}`,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {})
    },
    method
  });

  const data = (await response.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;

  if (!response.ok) {
    throw new Error(data?.error?.message ?? "Stripe no pudo procesar la solicitud.");
  }

  if (!data) {
    throw new Error("Stripe regreso una respuesta vacia.");
  }

  return data;
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
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
}
