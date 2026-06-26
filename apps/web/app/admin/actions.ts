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

  await notifyInvestor(payment.investorId, {
    type: "withdrawal_approved",
    category: "PAYMENTS",
    icon: "wallet",
    title: "Retiro aprobado",
    message: "Tu solicitud de retiro fue aprobada y esta en proceso de pago."
  });

  revalidatePath("/admin/dashboard");
  revalidatePath("/dashboard/wallet");
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

  await notifyInvestor(payment.investorId, {
    type: "withdrawal_rejected",
    category: "PAYMENTS",
    icon: "wallet",
    title: "Retiro declinado",
    message: "Tu solicitud de retiro fue declinada. Revisa tu metodo de pago o contacta a soporte."
  });

  revalidatePath("/admin/dashboard");
  revalidatePath("/dashboard/wallet");
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

export async function updateKycDocumentStatus(formData: FormData) {
  await requireAdmin();
  const investorId = getString(formData, "investorId");
  const document = getString(formData, "document");
  const status = getString(formData, "status") === "VERIFIED" ? "VERIFIED" : "REJECTED";

  if (!investorId) return;

  const data: {
    status?: "VERIFIED" | "REJECTED";
    proofOfAddressStatus?: "VERIFIED" | "REJECTED";
    selfieStatus?: "VERIFIED" | "REJECTED";
  } = {};
  if (document === "official") data.status = status;
  if (document === "proof") data.proofOfAddressStatus = status;
  if (document === "selfie") data.selfieStatus = status;

  if (!Object.keys(data).length) return;

  await prisma.identityVerification.update({
    where: { investorId },
    data
  });

  await notifyInvestor(investorId, {
    type: status === "VERIFIED" ? "kyc_document_approved" : "kyc_document_rejected",
    category: "SECURITY",
    icon: status === "VERIFIED" ? "shield-check" : "shield-alert",
    title: status === "VERIFIED" ? "Documento aprobado" : "Documento rechazado",
    message: status === "VERIFIED"
      ? "Uno de tus documentos fue aprobado por el equipo de validacion."
      : "Uno de tus documentos fue rechazado. Revisa tu verificacion de identidad."
  });

  revalidatePath("/admin/dashboard");
  revalidatePath("/dashboard/profile");
}

async function notifyInvestor(
  investorId: string,
  input: {
    type: string;
    category: "INVESTMENTS" | "COMMUNITY" | "LEVELS" | "PAYMENTS" | "SECURITY" | "SYSTEM";
    icon: string;
    title: string;
    message: string;
  }
) {
  await prisma.notification.create({
    data: {
      investorId,
      type: input.type,
      category: input.category,
      priority: "MEDIUM",
      icon: input.icon,
      title: input.title,
      message: input.message
    }
  });
}
