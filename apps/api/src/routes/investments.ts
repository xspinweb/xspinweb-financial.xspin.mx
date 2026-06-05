import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { addDays, calculateReinvestment, roundMoney } from "../business/rules.js";

export const investmentsRouter = Router();

const reinvestSchema = z.object({
  capitalAmount: z.number().positive().optional()
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

investmentsRouter.post("/:id/reinvest", async (req, res, next) => {
  try {
    const input = reinvestSchema.parse(req.body);
    const rules = config.defaultBusinessRules;

    const result = await prisma.$transaction(async (tx) => {
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
