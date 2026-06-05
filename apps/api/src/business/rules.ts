import { config } from "../config.js";

export type BusinessRules = typeof config.defaultBusinessRules;

export function calculateInitialInvestment(amount: number, rules: BusinessRules) {
  const returnAmount = roundMoney(amount * rules.returnMultiplier);
  const referralBonusAmount = roundMoney(amount * rules.referralBonusRate);
  const paymentDueAt = addDays(new Date(), rules.cycleDays);

  return {
    principalAmount: roundMoney(amount),
    returnAmount,
    referralBonusAmount,
    expectedPaymentAmount: returnAmount,
    paymentDueAt
  };
}

export function calculateReinvestment(capital: number, cycleNumber: number, rules: BusinessRules) {
  if (cycleNumber === 2) {
    return {
      paidYieldAmount: roundMoney(capital),
      reinvestedAmount: 0
    };
  }

  const paidYieldAmount = roundMoney(capital * rules.yieldRate);

  return {
    paidYieldAmount,
    reinvestedAmount: roundMoney(capital - paidYieldAmount)
  };
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function generateInvestorCode() {
  const numbers = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    .split("")
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .join("");

  return `${numbers}${letters}`;
}
