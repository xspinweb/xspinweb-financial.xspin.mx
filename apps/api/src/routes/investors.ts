import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { calculateInitialInvestment, generateInvestorCode } from "../business/rules.js";

export const investorsRouter = Router();

const createInvestorSchema = z.object({
  fullName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  referredByInvestorId: z.string().optional(),
  initialInvestmentAmount: z.number().positive()
});

investorsRouter.get("/", async (_req, res, next) => {
  try {
    const investors = await prisma.investor.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        investments: {
          orderBy: { cycleNumber: "desc" },
          take: 1
        },
        referredInvestors: true
      }
    });

    res.json(investors);
  } catch (error) {
    next(error);
  }
});

investorsRouter.post("/", async (req, res, next) => {
  try {
    const input = createInvestorSchema.parse(req.body);
    const rules = config.defaultBusinessRules;

    const result = await prisma.$transaction(async (tx) => {
      const group = await getOrCreateOpenGroup(tx, rules.groupSize);
      const investorCode = await createUniqueInvestorCode(tx);

      const investor = await tx.investor.create({
        data: {
          investorCode,
          fullName: input.fullName,
          phone: input.phone,
          email: input.email,
          referredByInvestorId: input.referredByInvestorId
        }
      });

      const calculated = calculateInitialInvestment(input.initialInvestmentAmount, rules);

      const investment = await tx.investment.create({
        data: {
          investorId: investor.id,
          groupId: group.id,
          cycleNumber: 1,
          principalAmount: calculated.principalAmount,
          returnAmount: calculated.returnAmount,
          referralBonusAmount: calculated.referralBonusAmount,
          expectedPaymentAmount: calculated.expectedPaymentAmount,
          paymentDueAt: calculated.paymentDueAt
        }
      });

      if (input.referredByInvestorId) {
        await tx.referral.create({
          data: {
            referrerInvestorId: input.referredByInvestorId,
            referredInvestorId: investor.id,
            sourceInvestmentId: investment.id,
            bonusAmount: calculated.referralBonusAmount
          }
        });
      }

      return { investor, investment };
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

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
  }

  if (current) {
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
