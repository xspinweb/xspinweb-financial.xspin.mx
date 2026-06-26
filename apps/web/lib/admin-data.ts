import { prisma } from "./prisma";

const cycleWeeks = 8;
const superAdminEmail = "carlos.rosado.escobar@gmail.com";

export type AdminLevel = "ADMIN" | "Explorer" | "Starter" | "Builder" | "Elite" | "Legend";

export async function getAdminDashboardData(selectedUserId?: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    investors,
    totalUsers,
    activeUsers,
    newToday,
    activeInvestments,
    totalInvested,
    totalPaid,
    kycPending,
    withdrawalPayments
  ] = await Promise.all([
    prisma.investor.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        identityVerification: true,
        investments: {
          orderBy: { createdAt: "desc" },
          include: {
            group: true,
            payments: true,
            newReinvestment: true,
            previousReinvestment: true
          }
        },
        payments: true,
        payoutMethods: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }]
        },
        referralsGiven: {
          include: {
            referredInvestor: {
              include: {
                investments: true
              }
            }
          }
        },
        notifications: {
          orderBy: { createdAt: "desc" },
          take: 6
        }
      }
    }),
    prisma.investor.count(),
    prisma.investor.count({ where: { status: "ACTIVE" } }),
    prisma.investor.count({ where: { createdAt: { gte: today } } }),
    prisma.investment.count({ where: { status: "ACTIVE" } }),
    prisma.investment.aggregate({ _sum: { principalAmount: true } }),
    prisma.payment.aggregate({ _sum: { amount: true } }),
    prisma.identityVerification.count({
      where: {
        OR: [
          { status: "SUBMITTED" },
          { proofOfAddressStatus: "SUBMITTED" },
          { selfieStatus: "SUBMITTED" }
        ]
      }
    }),
    prisma.payment.findMany({
      where: {
        paymentType: "ADJUSTMENT",
        notes: { contains: "retiro" }
      },
      orderBy: { paidAt: "desc" },
      take: 30,
      include: {
        investor: {
          include: {
            payoutMethods: {
              orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }]
            }
          }
        }
      }
    })
  ]);

  const users = investors
    .map((investor) => mapInvestor(investor))
    .sort((a, b) => Number(b.isAdmin) - Number(a.isAdmin) || b.registeredAt.getTime() - a.registeredAt.getTime());
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? users[0] ?? null;

  return {
    stats: {
      totalUsers,
      activeUsers,
      newToday,
      activeInvestments,
      pendingWithdrawals: withdrawalPayments.length,
      pendingKyc: kycPending,
      totalInvested: money(totalInvested._sum.principalAmount),
      totalPaid: money(totalPaid._sum.amount)
    },
    users,
    selectedUser,
    withdrawals: withdrawalPayments.map((payment) => ({
      id: payment.id,
      userName: payment.investor.fullName ?? "Usuario",
      email: payment.investor.email ?? "-",
      amount: money(payment.amount),
      requestedAt: payment.paidAt,
      status: "Pendiente",
      method: formatPayoutMethod(payment.investor.payoutMethods[0])
    })),
    charts: buildCharts(users, withdrawalPayments.length)
  };
}

type InvestorWithRelations = Awaited<ReturnType<typeof prisma.investor.findMany>>[number] & {
  identityVerification: unknown;
  investments: Array<{
    id: string;
    cycleNumber: number;
    principalAmount: unknown;
    returnAmount: unknown;
    referralBonusAmount: unknown;
    expectedPaymentAmount: unknown;
    paymentDueAt: Date;
    status: string;
    createdAt: Date;
    paidAt: Date | null;
    group: { groupNumber: number; status: string };
    payments: Array<{ amount: unknown; paymentType: string; paidAt: Date; notes: string | null }>;
    newReinvestment: unknown;
    previousReinvestment: unknown;
  }>;
  payments: Array<{ amount: unknown; paymentType: string; paidAt: Date; notes: string | null }>;
  payoutMethods: Array<Record<string, unknown>>;
  referralsGiven: Array<{
    referredInvestor: {
      investments: Array<{ id: string }>;
    };
  }>;
  notifications: Array<{ id: string; title: string; message: string; createdAt: Date; readAt: Date | null }>;
};

function mapInvestor(investor: InvestorWithRelations) {
  const totalInvested = investor.investments.reduce((sum, investment) => sum + money(investment.principalAmount), 0);
  const totalPaid = investor.payments.reduce((sum, payment) => sum + money(payment.amount), 0);
  const completedCycles = investor.investments.filter((investment) => investment.status === "PAID" || investment.paidAt).length;
  const activeReferrals = investor.referralsGiven.filter((referral) => referral.referredInvestor.investments.length > 0).length;
  const isAdmin = investor.email?.toLowerCase() === superAdminEmail;
  const level = isAdmin ? "ADMIN" : getLevel({ totalInvested, completedCycles, activeReferrals });
  const activeGroups = new Set(investor.investments.filter((investment) => investment.status === "ACTIVE").map((investment) => investment.group.groupNumber));
  const lastInvestment = investor.investments[0];
  const lastWithdrawal = investor.payments
    .filter((payment) => payment.paymentType === "ADJUSTMENT" && payment.notes?.toLowerCase().includes("retiro"))
    .sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime())[0];

  return {
    id: investor.id,
    code: investor.investorCode,
    labelId: `#${investor.investorCode?.slice(-6) || investor.id.slice(-6)}`,
    isAdmin,
    level,
    fullName: investor.fullName ?? "Usuario sin nombre",
    profileImage: investor.profileImage ?? null,
    userName: investor.email?.split("@")[0] ?? investor.investorCode,
    email: investor.email ?? "-",
    phone: investor.phone ?? "-",
    birthDate: investor.birthDate,
    country: investor.country ?? "-",
    city: investor.city ?? "-",
    address: investor.address ?? "-",
    registeredAt: investor.createdAt,
    connection: isOnline(investor.updatedAt) ? "Online" : "Offline",
    lastAccessAt: investor.updatedAt,
    kyc: getKycStatus(investor.identityVerification),
    activeGroups: activeGroups.size,
    currentGroup: lastInvestment ? `G-${lastInvestment.group.groupNumber}` : "-",
    totalInvested,
    totalPaid,
    patrimony: totalInvested + totalPaid,
    bonuses: investor.investments.reduce((sum, investment) => sum + money(investment.referralBonusAmount), 0),
    activeReferrals,
    investments: investor.investments.map((investment) => ({
      id: investment.id,
      group: `G-${investment.group.groupNumber}`,
      week: `${Math.min(investment.cycleNumber, cycleWeeks)} de ${cycleWeeks}`,
      principal: money(investment.principalAmount),
      expected: money(investment.expectedPaymentAmount),
      returnAmount: money(investment.returnAmount),
      bonus: money(investment.referralBonusAmount),
      dueAt: investment.paymentDueAt,
      createdAt: investment.createdAt,
      status: investment.status
    })),
    payoutMethods: investor.payoutMethods.map(formatPayoutMethod),
    primaryPayoutMethod: formatPayoutMethod(investor.payoutMethods[0]),
    lastWithdrawal: lastWithdrawal
      ? {
          date: lastWithdrawal.paidAt,
          amount: money(lastWithdrawal.amount),
          method: formatPayoutMethod(investor.payoutMethods[0]),
          status: "Pendiente"
        }
      : null,
    notifications: investor.notifications,
    identityVerification: investor.identityVerification
  };
}

function getLevel(input: { totalInvested: number; completedCycles: number; activeReferrals: number }): AdminLevel {
  if (input.completedCycles >= 20 && input.totalInvested >= 100000 && input.activeReferrals >= 50) return "Legend";
  if (input.completedCycles >= 10 && input.totalInvested >= 15000 && input.activeReferrals >= 25) return "Elite";
  if (input.completedCycles >= 3 && input.totalInvested >= 2000 && input.activeReferrals >= 5) return "Builder";
  if (input.totalInvested > 0) return "Starter";
  return "Explorer";
}

function buildCharts(users: ReturnType<typeof mapInvestor>[], pendingWithdrawals: number) {
  const byLevel = ["Starter", "Builder", "Explorer", "Elite", "Legend"].map((level) => ({
    label: level,
    count: users.filter((user) => user.level === level).length
  }));

  return {
    investmentTrend: [24, 31, 38, 42, 40, 51, 48, 55, 53, 62, 60, 69],
    byLevel,
    withdrawals: {
      pending: pendingWithdrawals,
      approved: Math.max(users.length - pendingWithdrawals, 0),
      rejected: 0
    }
  };
}

function getKycStatus(identityVerification: unknown) {
  if (!identityVerification || typeof identityVerification !== "object") return "Pendiente";
  const record = identityVerification as Record<string, unknown>;
  const statuses = [record.status, record.proofOfAddressStatus, record.selfieStatus];
  if (statuses.every((status) => status === "VERIFIED")) return "Verificado";
  if (statuses.some((status) => status === "SUBMITTED")) return "Validacion";
  if (statuses.some((status) => status === "REJECTED")) return "Rechazado";
  return "Pendiente";
}

function formatPayoutMethod(method?: Record<string, unknown>) {
  if (!method) return { type: "-", label: "Sin metodo", detail: "-", isPrimary: false };
  const type = String(method.type ?? "-");
  if (type === "BANK") {
    return {
      type,
      label: "Transferencia Bancaria",
      detail: `${method.bankName ?? "Banco"} | CLABE: ${mask(String(method.clabe ?? ""))}`,
      isPrimary: Boolean(method.isPrimary)
    };
  }
  if (type === "PAYPAL") return { type, label: "PayPal", detail: String(method.email ?? "-"), isPrimary: Boolean(method.isPrimary) };
  if (type === "PAXUM") return { type, label: "Paxum", detail: String(method.paxumAccount ?? "-"), isPrimary: Boolean(method.isPrimary) };
  return {
    type,
    label: `${method.coin ?? "Crypto"} Wallet`,
    detail: mask(String(method.walletAddress ?? "")),
    isPrimary: Boolean(method.isPrimary)
  };
}

function money(value: unknown) {
  return Number(value ?? 0);
}

function mask(value: string) {
  if (!value) return "-";
  if (value.length <= 8) return value;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function isOnline(date: Date) {
  return Date.now() - date.getTime() < 15 * 60 * 1000;
}
