import { Router } from "express";
import { prisma } from "../db.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", async (_req, res, next) => {
  try {
    const [
      activeInvestors,
      totalInvestors,
      activeInvestments,
      totalPaid,
      totalPrincipal
    ] = await Promise.all([
      prisma.investor.count({ where: { status: "ACTIVE" } }),
      prisma.investor.count(),
      prisma.investment.count({ where: { status: "ACTIVE" } }),
      prisma.payment.aggregate({ _sum: { amount: true } }),
      prisma.investment.aggregate({ _sum: { principalAmount: true } })
    ]);

    res.json({
      activeInvestors,
      totalInvestors,
      activeInvestments,
      totalPaid: totalPaid._sum.amount ?? 0,
      totalPrincipal: totalPrincipal._sum.principalAmount ?? 0
    });
  } catch (error) {
    next(error);
  }
});
