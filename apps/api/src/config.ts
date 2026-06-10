import "dotenv/config";

export const config = {
  port: Number(process.env.API_PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-change-me",
  defaultBusinessRules: {
    returnMultiplier: 1.44,
    referralBonusRate: 0.05,
    referralYieldRate: 0.27,
    cycleDays: 7,
    groupSize: 16,
    totalCycleWeeks: 8,
    yieldRate: 0.15
  }
};
