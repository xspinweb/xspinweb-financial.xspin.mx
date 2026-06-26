import { prisma } from "./prisma";

type InvestorAccountInput = {
  email?: string | null;
  name?: string | null;
  image?: string | null;
};

export async function ensureInvestorAccount(input: InvestorAccountInput) {
  const email = input.email?.trim().toLowerCase();

  if (!email) {
    return null;
  }

  const fullName = clean(input.name) ?? email.split("@")[0] ?? "Usuario";
  const profileImage = clean(input.image);
  const current = await prisma.investor.findFirst({
    where: {
      email: {
        equals: email,
        mode: "insensitive"
      }
    }
  });

  if (current) {
    const data: { fullName?: string; profileImage?: string | null; email?: string } = {};

    if (!current.email || current.email !== email) data.email = email;
    if (!current.fullName || current.fullName !== fullName) data.fullName = fullName;
    if (profileImage && current.profileImage !== profileImage) data.profileImage = profileImage;

    if (Object.keys(data).length === 0) {
      return current;
    }

    return prisma.investor.update({
      where: { id: current.id },
      data
    });
  }

  return prisma.investor.create({
    data: {
      investorCode: await createUniqueInvestorCode(),
      fullName,
      email,
      profileImage
    }
  });
}

async function createUniqueInvestorCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const investorCode = generateInvestorCode();
    const existing = await prisma.investor.findUnique({ where: { investorCode } });

    if (!existing) {
      return investorCode;
    }
  }

  throw new Error("No se pudo generar un codigo unico de inversionista");
}

function generateInvestorCode() {
  const numbers = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    .split("")
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .join("");

  return `${numbers}${letters}`;
}

function clean(value?: string | null) {
  const next = value?.trim();
  return next ? next : null;
}
