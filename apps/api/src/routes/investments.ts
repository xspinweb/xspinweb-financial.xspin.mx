import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { addDays, calculateInitialInvestment, calculateReinvestment, generateInvestorCode, roundMoney } from "../business/rules.js";

export const investmentsRouter = Router();

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

const reinvestSchema = z.object({
  capitalAmount: z.number().positive().optional()
});

const createInvestmentSchema = z.object({
  amount: z.number().min(20).max(2000),
  email: z.string().email(),
  fullName: z.string().optional(),
  referredByCode: z.string().optional(),
  sourceInvestmentId: z.string().optional()
});

investmentsRouter.get("/portfolio", async (req, res, next) => {
  try {
    const email = z.string().email().parse(req.query.email);
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
      res.json({
        investor: null,
        investments: []
      });
      return;
    }

    const investments = investor.investments as PortfolioInvestment[];

    res.json({
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
    });
  } catch (error) {
    next(error);
  }
});

investmentsRouter.post("/", async (req, res, next) => {
  try {
    const input = createInvestmentSchema.parse(req.body);
    const rules = config.defaultBusinessRules;

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

investmentsRouter.get("/due", async (_req, res, next) => {
  try {
    const investments = await prisma.investment.findMany({
      where: {
        status: "ACTIVE",
        paymentDueAt: {
          lte: new Date()
        }
      },
      include: {
        investor: true,
        group: true
      },
      orderBy: { paymentDueAt: "asc" }
    });

    res.json(investments);
  } catch (error) {
    next(error);
  }
});

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

investmentsRouter.post("/:id/reinvest", async (req, res, next) => {
  try {
    const input = reinvestSchema.parse(req.body);
    const rules = config.defaultBusinessRules;

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const current = await tx.investment.findUniqueOrThrow({
        where: { id: req.params.id },
        include: { investor: true }
      });

      const pendingBonuses = await tx.referral.aggregate({
        where: {
          referrerInvestorId: current.investorId,
          status: "PENDING"
        },
        _sum: { bonusAmount: true }
      });

      const capital = roundMoney(
        input.capitalAmount ??
          Number(current.returnAmount) + Number(pendingBonuses._sum.bonusAmount ?? 0)
      );

      const reinvestment = calculateReinvestment(capital, current.cycleNumber, rules);

      const newInvestment = await tx.investment.create({
        data: {
          investorId: current.investorId,
          groupId: current.groupId,
          cycleNumber: current.cycleNumber + 1,
          principalAmount: reinvestment.reinvestedAmount,
          returnAmount: roundMoney(reinvestment.reinvestedAmount * rules.returnMultiplier),
          expectedPaymentAmount: roundMoney(reinvestment.reinvestedAmount * rules.returnMultiplier),
          paymentDueAt: addDays(new Date(), rules.cycleDays)
        }
      });

      await tx.payment.create({
        data: {
          investorId: current.investorId,
          investmentId: current.id,
          groupId: current.groupId,
          amount: reinvestment.paidYieldAmount,
          paymentType: current.cycleNumber === 2 ? "FULL_PAYOUT" : "YIELD"
        }
      });

      await tx.referral.updateMany({
        where: {
          referrerInvestorId: current.investorId,
          status: "PENDING"
        },
        data: {
          status: "PAID",
          paidAt: new Date()
        }
      });

      await tx.investment.update({
        where: { id: current.id },
        data: {
          status: "REINVESTED",
          paidAt: new Date()
        }
      });

      const reinvestmentRecord = await tx.reinvestment.create({
        data: {
          previousInvestmentId: current.id,
          newInvestmentId: newInvestment.id,
          investorId: current.investorId,
          previousCapitalAmount: capital,
          paidYieldAmount: reinvestment.paidYieldAmount,
          reinvestedAmount: reinvestment.reinvestedAmount
        }
      });

      return { newInvestment, reinvestment: reinvestmentRecord };
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});
