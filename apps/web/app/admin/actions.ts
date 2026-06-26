"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { getAppRole } from "../../lib/access";
import { authOptions } from "../../lib/auth";
import { prisma } from "../../lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (getAppRole(session?.user?.email) !== "SUPER_ADMIN") {
    throw new Error("No autorizado");
  }
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function confirmWithdrawal(formData: FormData) {
  await requireAdmin();
  const paymentId = getString(formData, "paymentId");

  if (!paymentId) return;

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return;

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      notes: `${payment.notes ?? ""} | admin_confirmed:${new Date().toISOString()}`
    }
  });

  revalidatePath("/admin/dashboard");
}

export async function declineWithdrawal(formData: FormData) {
  await requireAdmin();
  const paymentId = getString(formData, "paymentId");

  if (!paymentId) return;

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return;

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      notes: `${payment.notes ?? ""} | admin_declined:${new Date().toISOString()}`
    }
  });

  revalidatePath("/admin/dashboard");
}

export async function toggleInvestorStatus(formData: FormData) {
  await requireAdmin();
  const investorId = getString(formData, "investorId");
  const nextStatus = getString(formData, "nextStatus") === "ACTIVE" ? "ACTIVE" : "BLOCKED";

  if (!investorId) return;

  await prisma.investor.update({
    where: { id: investorId },
    data: { status: nextStatus }
  });

  revalidatePath("/admin/dashboard");
}
