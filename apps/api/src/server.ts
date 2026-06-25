import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { addDays, calculateInitialInvestment, generateInvestorCode, roundMoney } from "./business/rules.js";
import { config } from "./config.js";
import { prisma } from "./db.js";

const createInvestmentSchema = z.object({
  amount: z.number().min(20).max(2000),
  email: z.string().email(),
  fullName: z.string().optional(),
  referredByCode: z.string().optional(),
  sourceInvestmentId: z.string().optional()
});

const checkoutConfirmSchema = z.object({
  sessionId: z.string().min(1)
});

const reinvestSchema = z.object({
  reinvestPercent: z.number().min(82).max(100),
  weekNumber: z.number().int().min(1).max(config.defaultBusinessRules.totalCycleWeeks).optional()
});

const collectSchema = z.object({
  weekNumber: z.number().int().min(1).max(config.defaultBusinessRules.totalCycleWeeks).optional()
});

const payoutMethodSchema = z.object({
  accountHolder: z.string().optional(),
  bankName: z.string().optional(),
  clabe: z.string().optional(),
  coin: z.string().optional(),
  email: z.string().email(),
  isPrimary: z.boolean().optional(),
  paxumAccount: z.string().optional(),
  payoutEmail: z.string().email().optional(),
  type: z.enum(["BANK", "PAYPAL", "PAXUM", "CRYPTO"]),
  walletAddress: z.string().optional()
});

const primaryPayoutMethodSchema = z.object({
  email: z.string().email()
});

const deletePayoutMethodSchema = z.object({
  email: z.string().email()
});

const walletWithdrawSchema = z.object({
  acceptedTerms: z.literal(true),
  email: z.string().email()
});

const investorProfileSchema = z.object({
  address: z.string().optional(),
  birthDate: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  email: z.string().email(),
  fullName: z.string().min(1),
  phone: z.string().optional()
});

const twoFactorSetupSchema = z.object({
  email: z.string().email()
});

const twoFactorVerifySchema = z.object({
  code: z.string().regex(/^\d{6}$/),
  email: z.string().email(),
  secret: z.string().min(16).optional()
});

const identityImageSchema = z.string()
  .regex(/^data:image\/(jpeg|jpg|png|webp);base64,/)
  .max(1_600_000);

const proofOfAddressSchema = z.object({
  dataUrl: z.string()
    .regex(/^data:(application\/pdf|image\/jpeg|image\/jpg|image\/png|image\/webp);base64,/)
    .max(36_000_000),
  fileName: z.string().min(1).max(180),
  mimeType: z.enum(["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"]),
  size: z.number().int().max(25 * 1024 * 1024)
});

const identityVerificationSchema = z.object({
  backImage: identityImageSchema.optional(),
  email: z.string().email(),
  frontImage: identityImageSchema.optional(),
  proofOfAddress: proofOfAddressSchema.optional(),
  selfieImage: identityImageSchema.optional()
}).refine((input) => input.frontImage || input.backImage || input.proofOfAddress || input.selfieImage, {
  message: "Agrega al menos un documento de verificacion."
});

const notificationCategorySchema = z.enum([
  "INVESTMENTS",
  "COMMUNITY",
  "LEVELS",
  "PAYMENTS",
  "SECURITY",
  "SYSTEM",
  "REMINDERS",
  "SPECIAL"
]);

const notificationReadSchema = z.object({
  email: z.string().email(),
  notificationId: z.string().min(1)
});

const notificationReadAllSchema = z.object({
  category: notificationCategorySchema.optional(),
  email: z.string().email()
});

type PortfolioInvestment = {
  id: string;
  principalAmount: unknown;
  group: { groupNumber: number };
  cycleNumber: number;
  createdAt: Date;
  paymentDueAt: Date;
  status: string;
  payments: Array<{
    id: string;
    amount: unknown;
    notes: string | null;
    paidAt: Date;
  }>;
  referralsSource: Array<{
    createdAt: Date;
    bonusAmount: unknown;
    referredInvestor: {
      fullName: string | null;
      investments: Array<{
        createdAt: Date;
        principalAmount: unknown;
        payments: Array<{
          notes: string | null;
          paidAt: Date;
        }>;
      }>;
    };
  }>;
};

type WeeklyInvestmentInput = {
  createdAt: Date;
  principalAmount: unknown;
  payments: Array<{
    notes: string | null;
    paidAt: Date;
  }>;
  referralsSource: Array<{
    referredInvestor: {
      investments: Array<{
        principalAmount: unknown;
        payments: Array<{
          notes: string | null;
          paidAt: Date;
        }>;
      }>;
    };
  }>;
};

type ReinvestReferral = {
  bonusAmount: unknown;
  referredInvestor: {
    investments: Array<{
      principalAmount: unknown;
      payments: Array<{
        notes: string | null;
        paidAt: Date;
      }>;
    }>;
  };
};

type InvestorLevelKey = "explorer" | "starter" | "builder" | "elite" | "legend";

type InvestorLevelRule = {
  activeReferrals: number;
  bonusRate: number;
  completedCycles: number;
  investmentLimit: number;
  key: InvestorLevelKey;
  minInvested: number;
  name: string;
  requirement: string;
  yieldRate: number;
};

const investorLevelRules: InvestorLevelRule[] = [
  {
    activeReferrals: 0,
    bonusRate: 0,
    completedCycles: 0,
    investmentLimit: 0,
    key: "explorer",
    minInvested: 0,
    name: "Explorer",
    requirement: "Registrado, sin inversion",
    yieldRate: 0
  },
  {
    activeReferrals: 0,
    bonusRate: 0.05,
    completedCycles: 0,
    investmentLimit: 2000,
    key: "starter",
    minInvested: 0,
    name: "Starter",
    requirement: "Primera inversion realizada",
    yieldRate: 0.13
  },
  {
    activeReferrals: 5,
    bonusRate: 0.053,
    completedCycles: 3,
    investmentLimit: 5000,
    key: "builder",
    minInvested: 2000,
    name: "Builder",
    requirement: "3 ciclos, $2,000 invertidos y 5 referidos activos",
    yieldRate: 0.16
  },
  {
    activeReferrals: 25,
    bonusRate: 0.06,
    completedCycles: 10,
    investmentLimit: 20000,
    key: "elite",
    minInvested: 15000,
    name: "Elite",
    requirement: "10 ciclos, $15,000 invertidos y 25 referidos activos",
    yieldRate: 0.175
  },
  {
    activeReferrals: 50,
    bonusRate: 0.062,
    completedCycles: 20,
    investmentLimit: 100000,
    key: "legend",
    minInvested: 100000,
    name: "Legend",
    requirement: "20 ciclos, $100,000 invertidos y 50 referidos activos",
    yieldRate: 0.182
  }
];

type StripeCheckoutSession = {
  id: string;
  metadata?: Record<string, string | undefined>;
  payment_status?: string;
  status?: string;
  url?: string;
};

const notificationCategories = [
  { label: "Inversiones", value: "INVESTMENTS" },
  { label: "Comunidad", value: "COMMUNITY" },
  { label: "Niveles", value: "LEVELS" },
  { label: "Pagos", value: "PAYMENTS" },
  { label: "Seguridad", value: "SECURITY" },
  { label: "Sistema", value: "SYSTEM" },
  { label: "Recordatorios", value: "REMINDERS" },
  { label: "Especiales", value: "SPECIAL" }
];

const notificationPriorityLabels = {
  HIGH: "alta",
  LOW: "baja",
  MEDIUM: "media"
} as const;

const notificationTemplates = {
  investment_created: {
    category: "INVESTMENTS",
    icon: "✅",
    message: "Tu inversión de {amount} se registró correctamente. Tu ciclo ha comenzado.",
    priority: "MEDIUM",
    title: "Inversión realizada"
  },
  reinvestment_completed: {
    category: "INVESTMENTS",
    icon: "🔄",
    message: "Se ha realizado la reinversión automática de {amount} correspondiente a tu ciclo.",
    priority: "MEDIUM",
    title: "Reinversión realizada"
  },
  cycle_completed: {
    category: "INVESTMENTS",
    icon: "🎉",
    message: "¡Felicidades! Has concluido exitosamente tu ciclo de inversión.",
    priority: "HIGH",
    title: "Ciclo completado"
  },
  weekly_yield_accredited: {
    category: "INVESTMENTS",
    icon: "📈",
    message: "Se acreditó un rendimiento de {amount} a tu inversión.",
    priority: "MEDIUM",
    title: "Rendimiento semanal acreditado"
  },
  withdrawal_available: {
    category: "INVESTMENTS",
    icon: "💸",
    message: "Ya puedes retirar {amount} correspondientes a esta semana.",
    priority: "HIGH",
    title: "Retiro disponible"
  },
  referral_registered: {
    category: "COMMUNITY",
    icon: "👤",
    message: "{name} acaba de registrarse con tu invitación.",
    priority: "LOW",
    title: "Nuevo referido registrado"
  },
  referral_invested: {
    category: "COMMUNITY",
    icon: "✅",
    message: "{name} realizó su primera inversión.",
    priority: "MEDIUM",
    title: "Referido activó su inversión"
  },
  referral_reinvested: {
    category: "COMMUNITY",
    icon: "🔄",
    message: "{name} reinvirtió exitosamente su ciclo.",
    priority: "MEDIUM",
    title: "Referido reinvirtió"
  },
  community_bonus_accredited: {
    category: "COMMUNITY",
    icon: "💰",
    message: "Se acreditó un bono por la actividad de tu comunidad.",
    priority: "MEDIUM",
    title: "Bono acreditado"
  },
  referral_pending: {
    category: "COMMUNITY",
    icon: "⚠️",
    message: "Uno de tus referidos aún no ha invertido. Completa tu red para activar el rendimiento.",
    priority: "HIGH",
    title: "Referido pendiente"
  },
  referral_inactive: {
    category: "COMMUNITY",
    icon: "❌",
    message: "Uno de tus referidos perdió el estado activo y dejó de generar bono.",
    priority: "MEDIUM",
    title: "Referido inactivo"
  },
  level_up: {
    category: "LEVELS",
    icon: "🥉",
    message: "¡Ahora eres {level}!",
    priority: "HIGH",
    title: "Nuevo nivel"
  },
  benefits_unlocked: {
    category: "LEVELS",
    icon: "🔓",
    message: "Ya puedes invertir hasta {limit}.",
    priority: "HIGH",
    title: "Beneficios desbloqueados"
  },
  next_level_progress: {
    category: "LEVELS",
    icon: "📊",
    message: "Te falta {cycles} ciclo para convertirte en {level}.",
    priority: "LOW",
    title: "Progreso"
  },
  withdrawal_requested: {
    category: "PAYMENTS",
    icon: "💵",
    message: "Tu solicitud de retiro fue recibida.",
    priority: "MEDIUM",
    title: "Solicitud de retiro"
  },
  withdrawal_approved: {
    category: "PAYMENTS",
    icon: "✅",
    message: "Tu retiro fue aprobado y está siendo procesado.",
    priority: "HIGH",
    title: "Retiro aprobado"
  },
  withdrawal_sent: {
    category: "PAYMENTS",
    icon: "🏦",
    message: "Tu retiro ya fue enviado a tu método de pago.",
    priority: "HIGH",
    title: "Retiro enviado"
  },
  withdrawal_rejected: {
    category: "PAYMENTS",
    icon: "❌",
    message: "Tu retiro requiere validación adicional.",
    priority: "HIGH",
    title: "Retiro rechazado"
  },
  new_login: {
    category: "SECURITY",
    icon: "🔑",
    message: "Se inició sesión desde un nuevo dispositivo.",
    priority: "HIGH",
    title: "Inicio de sesión nuevo"
  },
  password_changed: {
    category: "SECURITY",
    icon: "🔒",
    message: "Tu contraseña fue actualizada correctamente.",
    priority: "HIGH",
    title: "Contraseña cambiada"
  },
  two_factor_enabled: {
    category: "SECURITY",
    icon: "📱",
    message: "La autenticación en dos pasos quedó habilitada.",
    priority: "MEDIUM",
    title: "2FA activado"
  },
  failed_login_attempts: {
    category: "SECURITY",
    icon: "⚠️",
    message: "Detectamos varios intentos fallidos de acceso.",
    priority: "HIGH",
    title: "Intento fallido"
  },
  maintenance: {
    category: "SYSTEM",
    icon: "🔧",
    message: "La plataforma entrará en mantenimiento el {date}.",
    priority: "MEDIUM",
    title: "Mantenimiento"
  },
  promotion: {
    category: "SYSTEM",
    icon: "🎁",
    message: "Nuevo evento disponible para usuarios {level}.",
    priority: "LOW",
    title: "Promociones"
  },
  new_limit: {
    category: "SYSTEM",
    icon: "📈",
    message: "Ya puedes invertir hasta {limit}.",
    priority: "HIGH",
    title: "Nuevo límite"
  },
  reinvestment_soon: {
    category: "REMINDERS",
    icon: "⏰",
    message: "Tu reinversión automática se realizará en 24 horas.",
    priority: "MEDIUM",
    title: "Falta poco"
  },
  cycle_ends_tomorrow: {
    category: "REMINDERS",
    icon: "⏳",
    message: "Tu ciclo termina mañana.",
    priority: "HIGH",
    title: "Finaliza el ciclo"
  },
  complete_referrals: {
    category: "REMINDERS",
    icon: "⚠️",
    message: "Aún necesitas {count} referido activo para habilitar el rendimiento de esta semana.",
    priority: "HIGH",
    title: "Completa tus referidos"
  },
  streak: {
    category: "SPECIAL",
    icon: "🔥",
    message: "Llevas {cycles} ciclos consecutivos completados.",
    priority: "LOW",
    title: "Racha"
  },
  goal_reached: {
    category: "SPECIAL",
    icon: "🎯",
    message: "Superaste los {amount} de volumen acumulado.",
    priority: "MEDIUM",
    title: "Meta alcanzada"
  },
  next_level_near: {
    category: "SPECIAL",
    icon: "👑",
    message: "Estás al {progress}% para convertirte en {level}.",
    priority: "MEDIUM",
    title: "Próximo nivel"
  }
} as const;

type NotificationStream = {
  email: string;
  heartbeat: ReturnType<typeof setInterval>;
  investorId: string;
  refresh: ReturnType<typeof setInterval>;
  res: ServerResponse;
  signature: string;
};

const notificationStreams = new Map<string, Set<NotificationStream>>();

const server = createServer(async (req, res) => {
  try {
    await handleRequest(req, res);
  } catch (error) {
    sendJson(res, error instanceof Error ? 400 : 500, {
      error: error instanceof Error ? error.message : "Error interno"
    });
  }
});

server.listen(config.port, () => {
  console.log(`Pay Financial API running on http://localhost:${config.port}`);
});

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", "http://localhost");

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, {
      ok: true,
      service: "pay-financial-api"
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/notifications") {
    const email = z.string().email().parse(url.searchParams.get("email"));
    const categoryParam = url.searchParams.get("category") || undefined;
    const category = categoryParam ? notificationCategorySchema.parse(categoryParam) : undefined;
    const notifications = await getInvestorNotifications(email, category);
    sendJson(res, 200, notifications);
    return;
  }

  if (req.method === "GET" && url.pathname === "/notifications/stream") {
    const email = z.string().email().parse(url.searchParams.get("email"));
    await handleNotificationsStream(req, res, email);
    return;
  }

  if (req.method === "POST" && url.pathname === "/notifications/read") {
    const input = notificationReadSchema.parse(await readJson(req));
    const result = await markNotificationRead(input.email, input.notificationId);
    sendJson(res, 200, result);
    return;
  }

  if (req.method === "POST" && url.pathname === "/notifications/read-all") {
    const input = notificationReadAllSchema.parse(await readJson(req));
    const result = await markAllNotificationsRead(input.email, input.category);
    sendJson(res, 200, result);
    return;
  }

  if (req.method === "GET" && url.pathname === "/dashboard") {
    const [activeInvestors, totalInvestors, activeInvestments, totalPaid, totalPrincipal] = await Promise.all([
      prisma.investor.count({ where: { status: "ACTIVE" } }),
      prisma.investor.count(),
      prisma.investment.count({ where: { status: "ACTIVE" } }),
      prisma.payment.aggregate({ _sum: { amount: true } }),
      prisma.investment.aggregate({ _sum: { principalAmount: true } })
    ]);

    sendJson(res, 200, {
      activeInvestors,
      totalInvestors,
      activeInvestments,
      totalPaid: Number(totalPaid._sum.amount ?? 0),
      totalPrincipal: Number(totalPrincipal._sum.principalAmount ?? 0)
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/investments/portfolio") {
    const email = z.string().email().parse(url.searchParams.get("email"));
    const portfolio = await getPortfolio(email);
    sendJson(res, 200, portfolio);
    return;
  }

  if (req.method === "GET" && url.pathname === "/investor/profile") {
    const email = z.string().email().parse(url.searchParams.get("email"));
    const profile = await getInvestorProfile(email);
    sendJson(res, 200, profile);
    return;
  }

  if (req.method === "PUT" && url.pathname === "/investor/profile") {
    const input = investorProfileSchema.parse(await readJson(req));
    const profile = await updateInvestorProfile(input);
    sendJson(res, 200, profile);
    return;
  }

  if (req.method === "GET" && url.pathname === "/investor/security") {
    const email = z.string().email().parse(url.searchParams.get("email"));
    const security = await getInvestorSecurity(email);
    sendJson(res, 200, security);
    return;
  }

  if (req.method === "GET" && url.pathname === "/investor/level") {
    const email = z.string().email().parse(url.searchParams.get("email"));
    const level = await getInvestorLevel(email);
    sendJson(res, 200, level);
    return;
  }

  if (req.method === "GET" && url.pathname === "/investor/identity") {
    const email = z.string().email().parse(url.searchParams.get("email"));
    const identity = await getInvestorIdentityVerification(email);
    sendJson(res, 200, identity);
    return;
  }

  if (req.method === "POST" && url.pathname === "/investor/identity") {
    const input = identityVerificationSchema.parse(await readJson(req));
    const identity = await updateInvestorIdentityVerification(input);
    sendJson(res, 200, identity);
    return;
  }

  if (req.method === "POST" && url.pathname === "/investor/security/2fa/setup") {
    const input = twoFactorSetupSchema.parse(await readJson(req));
    const setup = await createTwoFactorSetup(input.email);
    sendJson(res, 201, setup);
    return;
  }

  if (req.method === "POST" && url.pathname === "/investor/security/2fa/verify") {
    const input = twoFactorVerifySchema.parse(await readJson(req));
    const security = await verifyTwoFactorSetup(input);
    sendJson(res, 200, security);
    return;
  }

  if (req.method === "POST" && url.pathname === "/investor/security/2fa/disable") {
    const input = twoFactorVerifySchema.omit({ secret: true }).parse(await readJson(req));
    const security = await disableTwoFactor(input);
    sendJson(res, 200, security);
    return;
  }

  if (req.method === "GET" && url.pathname === "/payout-methods") {
    const email = z.string().email().parse(url.searchParams.get("email"));
    const methods = await getPayoutMethods(email);
    sendJson(res, 200, methods);
    return;
  }

  if (req.method === "POST" && url.pathname === "/payout-methods") {
    const input = payoutMethodSchema.parse(await readJson(req));
    const method = await createPayoutMethod(input);
    sendJson(res, 201, method);
    return;
  }

  if (req.method === "POST" && url.pathname === "/wallet/withdraw") {
    const input = walletWithdrawSchema.parse(await readJson(req));
    const result = await requestWalletWithdrawal(input);
    sendJson(res, 201, result);
    return;
  }

  if (req.method === "POST" && url.pathname === "/investments") {
    const input = createInvestmentSchema.parse(await readJson(req));
    await assertReferralTargetOpen(input.referredByCode, input.sourceInvestmentId);
    const result = await createInvestment(input);
    sendJson(res, 201, result);
    return;
  }

  if (req.method === "POST" && url.pathname === "/checkout/investment") {
    const input = createInvestmentSchema.parse(await readJson(req));
    await assertReferralTargetOpen(input.referredByCode, input.sourceInvestmentId);
    const result = await createStripeInvestmentCheckout(input);
    sendJson(res, 201, result);
    return;
  }

  if (req.method === "POST" && url.pathname === "/checkout/confirm") {
    const input = checkoutConfirmSchema.parse(await readJson(req));
    const result = await confirmStripeInvestmentCheckout(input.sessionId);
    sendJson(res, 201, result);
    return;
  }

  const reinvestMatch = url.pathname.match(/^\/investments\/([^/]+)\/reinvest$/);
  const collectMatch = url.pathname.match(/^\/investments\/([^/]+)\/collect$/);
  const primaryPayoutMethodMatch = url.pathname.match(/^\/payout-methods\/([^/]+)\/primary$/);
  const payoutMethodMatch = url.pathname.match(/^\/payout-methods\/([^/]+)$/);

  if (req.method === "POST" && primaryPayoutMethodMatch) {
    const input = primaryPayoutMethodSchema.parse(await readJson(req));
    const method = await setPrimaryPayoutMethod(primaryPayoutMethodMatch[1], input.email);
    sendJson(res, 200, method);
    return;
  }

  if (req.method === "DELETE" && payoutMethodMatch) {
    const input = deletePayoutMethodSchema.parse(await readJson(req));
    const result = await deletePayoutMethod(payoutMethodMatch[1], input.email);
    sendJson(res, 200, result);
    return;
  }

  if (req.method === "POST" && reinvestMatch) {
    const input = reinvestSchema.parse(await readJson(req));
    const result = await reinvestInvestment(reinvestMatch[1], input);
    sendJson(res, 201, result);
    return;
  }

  if (req.method === "POST" && collectMatch) {
    const input = collectSchema.parse(await readJson(req));
    const result = await collectFinalInvestment(collectMatch[1], input);
    sendJson(res, 201, result);
    return;
  }

  if (req.method === "GET" && url.pathname === "/investments/due") {
    const investments = await prisma.investment.findMany({
      where: {
        status: "ACTIVE",
        paymentDueAt: {
          lte: new Date()
        }
      },
      include: {
        group: true,
        investor: true
      },
      orderBy: { paymentDueAt: "asc" }
    });

    sendJson(res, 200, investments);
    return;
  }

  sendJson(res, 404, {
    error: "Ruta no encontrada"
  });
}

async function getInvestorNotifications(email: string, category?: z.infer<typeof notificationCategorySchema>) {
  const investor = await prisma.investor.findFirst({
    select: { id: true },
    where: { email }
  });

  if (!investor) {
    return {
      categories: notificationCategories,
      notifications: [],
      templateTypes: Object.keys(notificationTemplates),
      unreadCount: 0
    };
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      where: {
        investorId: investor.id,
        readAt: null,
        ...(category ? { category } : {})
      }
    }),
    prisma.notification.count({
      where: {
        investorId: investor.id,
        readAt: null
      }
    })
  ]);

  const sorted = [...notifications].sort((current, next) => {
    const unreadDelta = Number(current.readAt !== null) - Number(next.readAt !== null);
    if (unreadDelta !== 0) {
      return unreadDelta;
    }

    return next.createdAt.getTime() - current.createdAt.getTime();
  });

  return {
    categories: notificationCategories,
    notifications: compactSimilarNotifications(sorted).map((notification) => ({
      actionUrl: notification.actionUrl,
      category: notification.category,
      categoryLabel: notificationCategories.find((item) => item.value === notification.category)?.label ?? notification.category,
      createdAt: notification.createdAt.toISOString(),
      groupCount: notification.groupCount,
      icon: notification.icon,
      id: notification.id,
      isRead: notification.readAt !== null,
      message: notification.message,
      priority: notificationPriorityLabels[notification.priority],
      priorityKey: notification.priority,
      readAt: notification.readAt?.toISOString() ?? null,
      title: notification.title,
      type: notification.type
    })),
    templateTypes: Object.keys(notificationTemplates),
    unreadCount
  };
}

async function handleNotificationsStream(req: IncomingMessage, res: ServerResponse, email: string) {
  const investor = await prisma.investor.findFirst({
    select: { id: true },
    where: { email }
  });

  res.writeHead(200, {
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "Content-Type": "text/event-stream",
    "X-Accel-Buffering": "no"
  });
  res.write("retry: 5000\n\n");

  if (!investor) {
    writeSse(res, "notifications", {
      categories: notificationCategories,
      notifications: [],
      templateTypes: Object.keys(notificationTemplates),
      unreadCount: 0
    });
    res.end();
    return;
  }

  const stream: NotificationStream = {
    email,
    heartbeat: setInterval(() => {
      res.write(": heartbeat\n\n");
    }, 25000),
    investorId: investor.id,
    refresh: setInterval(() => {
      void sendNotificationStreamUpdate(stream);
    }, 15000),
    res,
    signature: ""
  };
  const streams = notificationStreams.get(investor.id) ?? new Set<NotificationStream>();
  streams.add(stream);
  notificationStreams.set(investor.id, streams);

  req.on("close", () => {
    clearInterval(stream.heartbeat);
    clearInterval(stream.refresh);
    streams.delete(stream);

    if (streams.size === 0) {
      notificationStreams.delete(investor.id);
    }
  });

  await sendNotificationStreamUpdate(stream, true);
}

async function sendNotificationStreamUpdate(stream: NotificationStream, force = false) {
  const payload = await getInvestorNotifications(stream.email);
  const signature = buildNotificationsSignature(payload);

  if (!force && signature === stream.signature) {
    return;
  }

  stream.signature = signature;
  writeSse(stream.res, "notifications", payload);
}

function buildNotificationsSignature(payload: Awaited<ReturnType<typeof getInvestorNotifications>>) {
  return JSON.stringify({
    ids: payload.notifications.map((notification) => `${notification.id}:${notification.groupCount}:${notification.isRead}`).join("|"),
    unreadCount: payload.unreadCount
  });
}

function writeSse(res: ServerResponse, event: string, data: unknown) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function publishNotificationUpdate(investorId: string) {
  const streams = notificationStreams.get(investorId);

  if (!streams?.size) {
    return;
  }

  await Promise.all([...streams].map((stream) => sendNotificationStreamUpdate(stream, true)));
}

async function markNotificationRead(email: string, notificationId: string) {
  const investor = await prisma.investor.findFirst({
    select: { id: true },
    where: { email }
  });

  if (!investor) {
    return { ok: true };
  }

  await prisma.notification.updateMany({
    data: { readAt: new Date() },
    where: {
      id: notificationId,
      investorId: investor.id,
      readAt: null
    }
  });

  await publishNotificationUpdate(investor.id);

  return { ok: true };
}

async function markAllNotificationsRead(email: string, category?: z.infer<typeof notificationCategorySchema>) {
  const investor = await prisma.investor.findFirst({
    select: { id: true },
    where: { email }
  });

  if (!investor) {
    return { ok: true };
  }

  await prisma.notification.updateMany({
    data: { readAt: new Date() },
    where: {
      investorId: investor.id,
      readAt: null,
      ...(category ? { category } : {})
    }
  });

  await publishNotificationUpdate(investor.id);

  return { ok: true };
}

type DbNotification = Prisma.NotificationGetPayload<Record<string, never>>;

type CompactNotification = DbNotification & {
  groupCount: number;
};

function compactSimilarNotifications(notifications: DbNotification[]): CompactNotification[] {
  const compacted: CompactNotification[] = [];
  const grouped = new Set<string>();

  notifications.forEach((notification) => {
    if (grouped.has(notification.id)) {
      return;
    }

    const similar = notifications.filter((candidate) => {
      const sameReadState = Boolean(candidate.readAt) === Boolean(notification.readAt);
      return sameReadState
        && candidate.type === notification.type
        && candidate.category === notification.category
        && candidate.message === notification.message
        && candidate.actionUrl === notification.actionUrl;
    });

    similar.slice(1).forEach((candidate) => grouped.add(candidate.id));
    compacted.push({
      ...notification,
      groupCount: similar.length
    });
  });

  return compacted;
}

type NotificationTemplateType = keyof typeof notificationTemplates;

type NotificationVariables = Partial<Record<"amount" | "count" | "cycles" | "date" | "level" | "limit" | "name" | "progress", string | number>>;

type NotificationEvent = {
  actionUrl?: string;
  investorId: string;
  type: NotificationTemplateType;
  variables?: NotificationVariables;
};

function renderNotificationMessage(type: NotificationTemplateType, variables: NotificationVariables = {}) {
  return notificationTemplates[type].message.replace(/\{(\w+)\}/g, (match, key: keyof NotificationVariables) => {
    const value = variables[key];
    return value === undefined ? match : String(value);
  });
}

function formatNotificationAmount(amount: number) {
  return `$${roundMoney(amount).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} MXN`;
}

function buildLevelChangeNotifications(
  investorId: string,
  before: ReturnType<typeof buildInvestorLevel>,
  after: ReturnType<typeof buildInvestorLevel>
): NotificationEvent[] {
  if (before.current.key === after.current.key) {
    return [];
  }

  const currentRule = getLevelRule(after.current.key);
  const events: NotificationEvent[] = [{
    investorId,
    type: "level_up",
    variables: {
      level: after.current.name
    }
  }];

  if (currentRule.investmentLimit > 0) {
    events.push({
      investorId,
      type: "benefits_unlocked",
      variables: {
        limit: formatNotificationAmount(currentRule.investmentLimit)
      }
    });
  }

  return events;
}

async function dispatchNotificationEvents(events: NotificationEvent[]) {
  if (!events.length) {
    return;
  }

  await Promise.all(events.map(async (event) => {
    const template = notificationTemplates[event.type];

    try {
      await prisma.notification.create({
        data: {
          actionUrl: event.actionUrl,
          category: template.category,
          icon: template.icon,
          investorId: event.investorId,
          message: renderNotificationMessage(event.type, event.variables),
          priority: template.priority,
          title: template.title,
          type: event.type
        }
      });
      await publishNotificationUpdate(event.investorId);
    } catch (error) {
      console.error("No se pudo crear la notificacion", error);
    }
  }));
}

async function getPortfolio(email: string) {
  const investor = await prisma.investor.findFirst({
    where: { email },
    include: {
      payments: {
        orderBy: { paidAt: "asc" },
        select: {
          amount: true,
          notes: true,
          paidAt: true
        },
        where: {
          investmentId: null,
          paymentType: "FULL_PAYOUT"
        }
      },
      investments: {
        include: {
          group: true,
          referralsSource: {
            include: {
              referredInvestor: {
                include: {
                  investments: {
                    include: {
                      payments: {
                        orderBy: { paidAt: "asc" },
                        select: {
                          notes: true,
                          paidAt: true
                        }
                      }
                    },
                    orderBy: { createdAt: "desc" },
                    take: 1
                  }
                }
              }
            }
          },
          payments: {
            orderBy: { paidAt: "asc" },
            select: {
              id: true,
              amount: true,
              notes: true,
              paidAt: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!investor) {
    return {
      investor: null,
      investments: []
    };
  }

  const investments = investor.investments as PortfolioInvestment[];
  const investorLevel = buildInvestorLevel(investments);
  const levelRule = getLevelRule(investorLevel.current.key);

  return {
    investor: {
      id: investor.id,
      code: investor.investorCode,
      email: investor.email,
      level: investorLevel,
      name: investor.fullName
    },
    walletPayments: investor.payments.map((payment) => ({
      amount: Number(payment.amount),
      notes: payment.notes,
      paidAt: payment.paidAt
    })),
    investments: investments.map((investment: PortfolioInvestment) => ({
      id: investment.id,
      name: investor.fullName,
      amount: Number(investment.principalAmount),
      group: `Grupo ${investment.group.groupNumber}`,
      cycle: `Semana ${investment.cycleNumber} de ${config.defaultBusinessRules.totalCycleWeeks}`,
      investedAt: investment.createdAt,
      nextPaymentAt: investment.paymentDueAt,
      paidWeeks: investment.payments.length,
      payments: investment.payments.map((payment) => ({
        amount: Number(payment.amount),
        notes: payment.notes,
        paidAt: payment.paidAt
      })),
      weeks: buildInvestmentWeeks(investment, levelRule),
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
  };
}

async function getPayoutMethods(email: string) {
  const investor = await prisma.investor.findFirst({
    include: {
      payoutMethods: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }]
      }
    },
    where: { email }
  });

  if (!investor) {
    return [];
  }

  return investor.payoutMethods.map(formatPayoutMethod);
}

async function getInvestorProfile(email: string) {
  const investor = await prisma.investor.findFirst({
    where: { email }
  });

  if (!investor) {
    return {
      address: "",
      birthDate: "",
      city: "",
      country: "MX",
      email,
      fullName: "",
      phone: ""
    };
  }

  return formatInvestorProfile(investor);
}

async function updateInvestorProfile(input: z.infer<typeof investorProfileSchema>) {
  const current = await prisma.investor.findFirst({
    where: { email: input.email }
  });
  const data = {
    address: cleanNullable(input.address),
    birthDate: parseProfileDate(input.birthDate),
    city: cleanNullable(input.city),
    country: cleanNullable(input.country) ?? "MX",
    fullName: input.fullName,
    phone: cleanNullable(input.phone)
  };

  const investor = current
    ? await prisma.investor.update({
        data,
        where: { id: current.id }
      })
    : await prisma.investor.create({
      data: {
        address: cleanNullable(input.address),
        birthDate: parseProfileDate(input.birthDate),
        city: cleanNullable(input.city),
        country: cleanNullable(input.country) ?? "MX",
        email: input.email,
        fullName: input.fullName,
        investorCode: await createUniqueInvestorCode(prisma),
        phone: cleanNullable(input.phone)
      }
    });

  return formatInvestorProfile(investor);
}

async function getInvestorSecurity(email: string) {
  const investor = await prisma.investor.findFirst({
    where: { email }
  });

  return formatInvestorSecurity(investor, email);
}

async function getInvestorLevel(email: string) {
  const investor = await prisma.investor.findFirst({
    include: {
      investments: {
        include: {
          payments: {
            select: { id: true }
          },
          referralsSource: {
            select: {
              referredInvestor: {
                select: {
                  investments: {
                    select: { id: true },
                    take: 1
                  }
                }
              }
            }
          }
        }
      }
    },
    where: { email }
  });

  return buildInvestorLevel((investor?.investments ?? []) as Array<{
    principalAmount: unknown;
    payments: unknown[];
    referralsSource: Array<{ referredInvestor?: { investments?: unknown[] } }>;
    status: string;
  }>);
}

async function getInvestorIdentityVerification(email: string) {
  const investor = await prisma.investor.findFirst({
    include: {
      identityVerification: true
    },
    where: { email }
  });

  return formatIdentityVerification(investor?.identityVerification ?? null);
}

async function updateInvestorIdentityVerification(input: z.infer<typeof identityVerificationSchema>) {
  const investor = await getOrCreateInvestor(prisma, { email: input.email });
  const current = await prisma.identityVerification.findUnique({
    where: { investorId: investor.id }
  });
  const hasFront = Boolean(input.frontImage ?? current?.officialIdFront);
  const hasBack = Boolean(input.backImage ?? current?.officialIdBack);
  const hasOfficialIdInput = Boolean(input.frontImage || input.backImage);
  const hasProofOfAddressInput = Boolean(input.proofOfAddress);
  const hasSelfieInput = Boolean(input.selfieImage);
  const officialIdStatus = hasFront && hasBack ? "SUBMITTED" : "PENDING";

  const identity = await prisma.identityVerification.upsert({
    create: {
      investorId: investor.id,
      officialIdBack: input.backImage,
      officialIdFront: input.frontImage,
      proofOfAddressFile: input.proofOfAddress?.dataUrl,
      proofOfAddressFileName: input.proofOfAddress?.fileName,
      proofOfAddressMimeType: input.proofOfAddress?.mimeType,
      proofOfAddressStatus: hasProofOfAddressInput ? "SUBMITTED" : "PENDING",
      proofOfAddressSubmittedAt: hasProofOfAddressInput ? new Date() : null,
      selfieImage: input.selfieImage,
      selfieStatus: hasSelfieInput ? "SUBMITTED" : "PENDING",
      selfieSubmittedAt: hasSelfieInput ? new Date() : null,
      status: hasOfficialIdInput ? officialIdStatus : "PENDING",
      submittedAt: hasOfficialIdInput && officialIdStatus === "SUBMITTED" ? new Date() : null
    },
    update: {
      ...(input.backImage ? { officialIdBack: input.backImage } : {}),
      ...(input.frontImage ? { officialIdFront: input.frontImage } : {}),
      ...(input.selfieImage ? { selfieImage: input.selfieImage } : {}),
      ...(input.proofOfAddress ? {
        proofOfAddressFile: input.proofOfAddress.dataUrl,
        proofOfAddressFileName: input.proofOfAddress.fileName,
        proofOfAddressMimeType: input.proofOfAddress.mimeType
      } : {}),
      ...(hasProofOfAddressInput ? {
        proofOfAddressStatus: "SUBMITTED",
        proofOfAddressSubmittedAt: new Date()
      } : {}),
      ...(hasSelfieInput ? {
        selfieStatus: "SUBMITTED",
        selfieSubmittedAt: new Date()
      } : {}),
      ...(hasOfficialIdInput ? {
        status: officialIdStatus,
        submittedAt: officialIdStatus === "SUBMITTED" ? new Date() : current?.submittedAt ?? null
      } : {})
    },
    where: { investorId: investor.id }
  });

  return formatIdentityVerification(identity);
}

async function createTwoFactorSetup(email: string) {
  const investor = await getOrCreateInvestor(prisma, { email });
  const secret = generateBase32Secret();

  return {
    otpauthUrl: buildOtpAuthUrl(email, secret),
    secret,
    twoFactorEnabled: investor.twoFactorEnabled
  };
}

async function verifyTwoFactorSetup(input: z.infer<typeof twoFactorVerifySchema>) {
  const current = await prisma.investor.findFirst({
    where: { email: input.email }
  });
  const secret = normalizeBase32Secret(input.secret ?? current?.twoFactorSecret ?? "");

  if (!secret || !verifyTotpCode(secret, input.code)) {
    throw new Error("Codigo 2FA invalido. Revisa tu app de autenticacion.");
  }

  const investor = current
    ? await prisma.investor.update({
        data: {
          twoFactorEnabled: true,
          twoFactorSecret: secret,
          twoFactorVerifiedAt: new Date()
        },
        where: { id: current.id }
      })
    : await prisma.investor.create({
        data: {
          email: input.email,
          investorCode: await createUniqueInvestorCode(prisma),
          twoFactorEnabled: true,
          twoFactorSecret: secret,
          twoFactorVerifiedAt: new Date()
        }
      });

  await dispatchNotificationEvents([{
    investorId: investor.id,
    type: "two_factor_enabled"
  }]);

  return formatInvestorSecurity(investor, input.email);
}

async function disableTwoFactor(input: Omit<z.infer<typeof twoFactorVerifySchema>, "secret">) {
  const investor = await prisma.investor.findFirst({
    where: { email: input.email }
  });

  if (!investor?.twoFactorSecret || !verifyTotpCode(investor.twoFactorSecret, input.code)) {
    throw new Error("Codigo 2FA invalido. No se pudo desactivar.");
  }

  const updated = await prisma.investor.update({
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorVerifiedAt: null
    },
    where: { id: investor.id }
  });

  return formatInvestorSecurity(updated, input.email);
}

async function createPayoutMethod(input: z.infer<typeof payoutMethodSchema>) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const investor = await getOrCreateInvestor(tx, {
      email: input.email
    });
    const existingMethods = await tx.payoutMethod.count({
      where: { investorId: investor.id }
    });
    const isPrimary = input.isPrimary || existingMethods === 0;

    if (isPrimary) {
      await tx.payoutMethod.updateMany({
        data: { isPrimary: false },
        where: { investorId: investor.id }
      });
    }

    const method = await tx.payoutMethod.create({
      data: {
        accountHolder: cleanOptional(input.accountHolder),
        bankName: cleanOptional(input.bankName),
        clabe: cleanOptional(input.clabe),
        coin: cleanOptional(input.coin),
        email: cleanOptional(input.payoutEmail),
        investorId: investor.id,
        isPrimary,
        paxumAccount: cleanOptional(input.paxumAccount),
        type: input.type,
        walletAddress: cleanOptional(input.walletAddress)
      }
    });

    return formatPayoutMethod(method);
  });
}

async function setPrimaryPayoutMethod(methodId: string, email: string) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const investor = await tx.investor.findFirst({
      select: { id: true },
      where: { email }
    });

    if (!investor) {
      throw new Error("No se encontro el inversionista.");
    }

    const method = await tx.payoutMethod.findFirst({
      where: {
        id: methodId,
        investorId: investor.id
      }
    });

    if (!method) {
      throw new Error("No se encontro el metodo de pago.");
    }

    await tx.payoutMethod.updateMany({
      data: { isPrimary: false },
      where: { investorId: investor.id }
    });

    const updated = await tx.payoutMethod.update({
      data: { isPrimary: true },
      where: { id: method.id }
    });

    return formatPayoutMethod(updated);
  });
}

async function deletePayoutMethod(methodId: string, email: string) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const investor = await tx.investor.findFirst({
      select: { id: true },
      where: { email }
    });

    if (!investor) {
      throw new Error("No se encontro el inversionista.");
    }

    const method = await tx.payoutMethod.findFirst({
      where: {
        id: methodId,
        investorId: investor.id
      }
    });

    if (!method) {
      throw new Error("No se encontro el metodo de pago.");
    }

    await tx.payoutMethod.delete({
      where: { id: method.id }
    });

    if (method.isPrimary) {
      const nextMethod = await tx.payoutMethod.findFirst({
        orderBy: { createdAt: "asc" },
        where: { investorId: investor.id }
      });

      if (nextMethod) {
        await tx.payoutMethod.update({
          data: { isPrimary: true },
          where: { id: nextMethod.id }
        });
      }
    }

    return { ok: true };
  });
}

async function requestWalletWithdrawal(input: z.infer<typeof walletWithdrawSchema>) {
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const investor = await tx.investor.findFirst({
      include: {
        payments: {
          select: {
            amount: true,
            investmentId: true
          },
          where: {
            paymentType: {
              in: ["YIELD", "FULL_PAYOUT"]
            }
          }
        },
        payoutMethods: {
          where: { isPrimary: true },
          take: 1
        }
      },
      where: { email: input.email }
    });

    if (!investor) {
      throw new Error("No se encontro el inversionista.");
    }

    if (!investor.payoutMethods.length) {
      throw new Error("Configura un metodo de retiro principal antes de solicitar el pago.");
    }

    const availableBalance = roundMoney(investor.payments.reduce((total, payment) => total + Number(payment.amount), 0));

    if (availableBalance <= 0) {
      throw new Error("No tienes saldo disponible para retirar.");
    }

    const payment = await tx.payment.create({
      data: {
        amount: -availableBalance,
        investorId: investor.id,
        paymentType: "FULL_PAYOUT",
        notes: `Wallet: retiro solicitado por ${availableBalance}. Pago estimado en 1-2 dias.`
      }
    });

    return {
      amount: availableBalance,
      notificationEvents: [{
        investorId: investor.id,
        type: "withdrawal_requested" as const
      }],
      payment
    };
  });

  await dispatchNotificationEvents(result.notificationEvents);

  return {
    amount: result.amount,
    payment: result.payment
  };
}

async function createInvestment(input: z.infer<typeof createInvestmentSchema>) {
  const rules = config.defaultBusinessRules;

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const group = await createInvestmentGroup(tx);
    const investor = await getOrCreateInvestor(tx, {
      email: input.email,
      fullName: input.fullName
    });
    const investorLevelBefore = await getInvestorLevelSnapshot(tx, investor.id);
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
    const notificationEvents: NotificationEvent[] = [{
      investorId: investor.id,
      type: "investment_created",
      variables: {
        amount: formatNotificationAmount(Number(investment.principalAmount))
      }
    }];

    const referralTarget = parseReferralTarget(input.referredByCode, input.sourceInvestmentId);

    if (referralTarget.referredByCode && referralTarget.sourceInvestmentId) {
      const referrer = await tx.investor.findUnique({
        where: { investorCode: referralTarget.referredByCode }
      });
      const sourceInvestment = referrer
        ? await tx.investment.findFirst({
            where: {
              id: referralTarget.sourceInvestmentId,
              investorId: referrer.id
            },
            include: {
              payments: {
                select: { id: true },
                take: 1
              }
            }
          })
        : null;
      const sourceAcceptsReferrals = sourceInvestment ? sourceInvestment.payments.length === 0 : false;

      if (referrer && sourceInvestment && sourceAcceptsReferrals && referrer.id !== investor.id) {
        const referrerLevelBefore = await getInvestorLevelSnapshot(tx, referrer.id);
        const referrerLevelRule = getLevelRule(referrerLevelBefore.current.key);
        const bonusAmount = roundMoney(input.amount * referrerLevelRule.bonusRate);

        await tx.referral.create({
          data: {
            referrerInvestorId: referrer.id,
            referredInvestorId: investor.id,
            sourceInvestmentId: sourceInvestment.id,
            bonusAmount
          }
        });

        notificationEvents.push({
          investorId: referrer.id,
          type: "referral_invested",
          variables: {
            name: investor.fullName ?? investor.email ?? "Tu referido"
          }
        });

        if (bonusAmount > 0) {
          notificationEvents.push({
            investorId: referrer.id,
            type: "community_bonus_accredited"
          });
        }

        notificationEvents.push(
          ...buildLevelChangeNotifications(referrer.id, referrerLevelBefore, await getInvestorLevelSnapshot(tx, referrer.id))
        );
      }
    }

    notificationEvents.push(
      ...buildLevelChangeNotifications(investor.id, investorLevelBefore, await getInvestorLevelSnapshot(tx, investor.id))
    );

    return { investor, investment, notificationEvents };
  });

  await dispatchNotificationEvents(result.notificationEvents);

  return {
    investor: result.investor,
    investment: result.investment
  };
}

async function assertReferralTargetOpen(referredByCode?: string, sourceInvestmentId?: string) {
  const referralTarget = parseReferralTarget(referredByCode, sourceInvestmentId);

  if (!referralTarget.referredByCode || !referralTarget.sourceInvestmentId) {
    return;
  }

  const referrer = await prisma.investor.findUnique({
    select: { id: true },
    where: { investorCode: referralTarget.referredByCode }
  });

  if (!referrer) {
    return;
  }

  const sourceInvestment = await prisma.investment.findFirst({
    include: {
      payments: {
        select: { id: true },
        take: 1
      }
    },
    where: {
      id: referralTarget.sourceInvestmentId,
      investorId: referrer.id
    }
  });

  if (sourceInvestment?.payments.length) {
    throw new Error("Este grupo ya no acepta referidos porque la primera semana ya fue cobrada.");
  }
}

async function createStripeInvestmentCheckout(input: z.infer<typeof createInvestmentSchema>) {
  if (!config.stripeSecretKey) {
    throw new Error("Stripe no esta configurado en el servidor.");
  }

  const session = await stripeRequest<StripeCheckoutSession>("checkout/sessions", {
    "mode": "payment",
    "payment_method_types[0]": "card",
    "customer_email": input.email,
    "success_url": `${config.appUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    "cancel_url": `${config.appUrl}/dashboard?checkout=cancelled`,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "mxn",
    "line_items[0][price_data][unit_amount]": String(Math.round(input.amount * 100)),
    "line_items[0][price_data][product_data][name]": "Inversion Pay Financial",
    "line_items[0][price_data][product_data][description]": "Registro de inversion en modo pruebas",
    "metadata[amount]": String(input.amount),
    "metadata[email]": input.email,
    "metadata[fullName]": input.fullName ?? "",
    "metadata[referredByCode]": input.referredByCode ?? "",
    "metadata[sourceInvestmentId]": input.sourceInvestmentId ?? ""
  });

  if (!session.url) {
    throw new Error("Stripe no regreso una URL de pago.");
  }

  return {
    sessionId: session.id,
    url: session.url
  };
}

async function confirmStripeInvestmentCheckout(sessionId: string) {
  if (!config.stripeSecretKey) {
    throw new Error("Stripe no esta configurado en el servidor.");
  }

  const existingPayment = await prisma.payment.findFirst({
    where: {
      notes: {
        contains: getStripePaymentNote(sessionId)
      }
    },
    select: {
      investmentId: true
    }
  });

  if (existingPayment) {
    return {
      alreadyProcessed: true,
      investmentId: existingPayment.investmentId
    };
  }

  const session = await stripeRequest<StripeCheckoutSession>(`checkout/sessions/${encodeURIComponent(sessionId)}`, undefined, "GET");

  if (session.payment_status !== "paid" && session.status !== "complete") {
    throw new Error("El pago aun no esta confirmado por Stripe.");
  }

  const metadata = session.metadata ?? {};
  const amount = Number(metadata.amount);

  const input = createInvestmentSchema.parse({
    amount,
    email: metadata.email,
    fullName: metadata.fullName || undefined,
    referredByCode: metadata.referredByCode || undefined,
    sourceInvestmentId: metadata.sourceInvestmentId || undefined
  });
  const result = await createInvestment(input);

  await prisma.payment.create({
    data: {
      investorId: result.investor.id,
      groupId: result.investment.groupId,
      amount: input.amount,
      paymentType: "ADJUSTMENT",
      notes: `${getStripePaymentNote(sessionId)} inversion confirmada`
    }
  });

  return {
    alreadyProcessed: false,
    investmentId: result.investment.id
  };
}

async function reinvestInvestment(investmentId: string, input: z.infer<typeof reinvestSchema>) {
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const investment = await tx.investment.findUniqueOrThrow({
      where: { id: investmentId },
      include: {
        payments: {
          orderBy: { paidAt: "asc" },
          select: {
            notes: true,
            paidAt: true
          }
        },
        referralsSource: {
          include: {
            referredInvestor: {
              include: {
                  investments: {
                    include: {
                      payments: {
                        orderBy: { paidAt: "asc" },
                        select: {
                          notes: true,
                          paidAt: true
                        }
                      }
                    },
                    orderBy: { createdAt: "desc" },
                    take: 1
                  }
              }
            }
          }
        }
      }
    });
    const paidWeeks = investment.payments.length;
    const weekNumber = input.weekNumber ?? paidWeeks + 1;

    if (weekNumber !== paidWeeks + 1) {
      throw new Error("La semana seleccionada no esta disponible para reinversion.");
    }

    const referrals = investment.referralsSource as ReinvestReferral[];
    const paymentDate = addDays(investment.createdAt, weekNumber * config.defaultBusinessRules.cycleDays);

    if (paidWeeks >= config.defaultBusinessRules.totalCycleWeeks) {
      throw new Error(`Esta inversion ya concluyo sus ${config.defaultBusinessRules.totalCycleWeeks} semanas.`);
    }

    if (weekNumber >= config.defaultBusinessRules.totalCycleWeeks) {
      throw new Error(`La semana ${config.defaultBusinessRules.totalCycleWeeks} es cierre final y no permite reinversion.`);
    }

    if (referrals.length < 2) {
      throw new Error("La reinversion requiere al menos 2 referidos vinculados.");
    }

    if (new Date() < paymentDate) {
      throw new Error("La fecha de pago de esta semana aun no ha llegado.");
    }

    const levelRule = await getInvestorLevelRule(tx, investment.investorId);
    const week = buildInvestmentWeeks(investment, levelRule)[weekNumber - 1];

    if (!week || week.baseAmount <= 0) {
      throw new Error("Esta semana no tiene capital base para reinversion.");
    }

    if (!week.canCollect) {
      throw new Error(`Esta semana requiere que los ${referrals.length} referidos vinculados hayan invertido o reinvertido.`);
    }

    const totalGenerated = week.totalGenerated;
    const reinvestedAmount = roundMoney(totalGenerated * (input.reinvestPercent / 100));
    const withdrawalAmount = roundMoney(totalGenerated - reinvestedAmount);
    const investor = await tx.investor.findUnique({
      select: {
        email: true,
        fullName: true
      },
      where: { id: investment.investorId }
    });
    const referrerLinks = await tx.referral.findMany({
      select: {
        referrerInvestorId: true
      },
      where: {
        referredInvestorId: investment.investorId
      }
    });
    const notificationEvents: NotificationEvent[] = [
      {
        investorId: investment.investorId,
        type: "weekly_yield_accredited",
        variables: {
          amount: formatNotificationAmount(week.weeklyYield)
        }
      },
      {
        investorId: investment.investorId,
        type: "reinvestment_completed",
        variables: {
          amount: formatNotificationAmount(reinvestedAmount)
        }
      }
    ];

    if (withdrawalAmount > 0) {
      notificationEvents.push({
        investorId: investment.investorId,
        type: "withdrawal_available",
        variables: {
          amount: formatNotificationAmount(withdrawalAmount)
        }
      });
    }

    for (const link of referrerLinks) {
      const referrerLevelRule = await getInvestorLevelRule(tx, link.referrerInvestorId);
      const bonusAmount = roundMoney(reinvestedAmount * referrerLevelRule.bonusRate);

      notificationEvents.push({
        investorId: link.referrerInvestorId,
        type: "referral_reinvested",
        variables: {
          name: investor?.fullName ?? investor?.email ?? "Tu referido"
        }
      });

      if (bonusAmount > 0) {
        notificationEvents.push({
          investorId: link.referrerInvestorId,
          type: "community_bonus_accredited"
        });
      }
    }

    const payment = await tx.payment.create({
      data: {
        investorId: investment.investorId,
        investmentId: investment.id,
        groupId: investment.groupId,
        amount: withdrawalAmount,
        paymentType: "YIELD",
        notes: `Semana ${weekNumber}: reinversion ${input.reinvestPercent}%, reinvertido ${reinvestedAmount}, retiro ${withdrawalAmount}`
      }
    });

    return {
      notificationEvents,
      payment,
      reinvestedAmount,
      totalGenerated,
      withdrawalAmount,
      weekNumber
    };
  });

  await dispatchNotificationEvents(result.notificationEvents);

  return {
    payment: result.payment,
    reinvestedAmount: result.reinvestedAmount,
    totalGenerated: result.totalGenerated,
    withdrawalAmount: result.withdrawalAmount,
    weekNumber: result.weekNumber
  };
}

async function collectFinalInvestment(investmentId: string, input: z.infer<typeof collectSchema>) {
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const investment = await tx.investment.findUniqueOrThrow({
      where: { id: investmentId },
      include: {
        payments: {
          orderBy: { paidAt: "asc" },
          select: {
            notes: true,
            paidAt: true
          }
        },
        referralsSource: {
          include: {
            referredInvestor: {
              include: {
                investments: {
                  include: {
                    payments: {
                      orderBy: { paidAt: "asc" },
                      select: {
                        notes: true,
                        paidAt: true
                      }
                    }
                  },
                  orderBy: { createdAt: "desc" },
                  take: 1
                }
              }
            }
          }
        }
      }
    });
    const paidWeeks = investment.payments.length;
    const weekNumber = input.weekNumber ?? paidWeeks + 1;
    const totalWeeks = config.defaultBusinessRules.totalCycleWeeks;

    if (weekNumber !== paidWeeks + 1) {
      throw new Error("La semana seleccionada no esta disponible para cobro.");
    }

    if (weekNumber !== totalWeeks) {
      throw new Error(`El cierre final solo esta disponible en la semana ${totalWeeks}.`);
    }

    if (paidWeeks >= totalWeeks) {
      throw new Error(`Esta inversion ya concluyo sus ${totalWeeks} semanas.`);
    }

    const paymentDate = addDays(investment.createdAt, weekNumber * config.defaultBusinessRules.cycleDays);

    if (new Date() < paymentDate) {
      throw new Error("La fecha de pago final aun no ha llegado.");
    }

    const referrals = investment.referralsSource as ReinvestReferral[];

    if (referrals.length < 2) {
      throw new Error("El cobro final requiere al menos 2 referidos vinculados.");
    }

    const levelRule = await getInvestorLevelRule(tx, investment.investorId);
    const week = buildInvestmentWeeks(investment, levelRule)[weekNumber - 1];

    if (!week || week.baseAmount <= 0) {
      throw new Error("Esta semana no tiene capital base para cobro final.");
    }

    if (!week.canCollect) {
      throw new Error(`El cobro final requiere que los ${referrals.length} referidos vinculados hayan invertido o reinvertido.`);
    }

    const investorLevelBefore = await getInvestorLevelSnapshot(tx, investment.investorId);
    const totalGenerated = week.totalGenerated;
    const notificationEvents: NotificationEvent[] = [
      {
        investorId: investment.investorId,
        type: "weekly_yield_accredited",
        variables: {
          amount: formatNotificationAmount(week.weeklyYield)
        }
      },
      {
        investorId: investment.investorId,
        type: "cycle_completed"
      },
      {
        investorId: investment.investorId,
        type: "withdrawal_available",
        variables: {
          amount: formatNotificationAmount(totalGenerated)
        }
      }
    ];
    const payment = await tx.payment.create({
      data: {
        investorId: investment.investorId,
        investmentId: investment.id,
        groupId: investment.groupId,
        amount: totalGenerated,
        paymentType: "YIELD",
        notes: `Semana ${weekNumber}: cierre final, retiro ${totalGenerated}`
      }
    });

    await tx.investment.update({
      data: {
        paidAt: new Date(),
        status: "PAID"
      },
      where: { id: investment.id }
    });

    notificationEvents.push(
      ...buildLevelChangeNotifications(investment.investorId, investorLevelBefore, await getInvestorLevelSnapshot(tx, investment.investorId))
    );

    return {
      notificationEvents,
      payment,
      totalGenerated,
      withdrawalAmount: totalGenerated,
      weekNumber
    };
  });

  await dispatchNotificationEvents(result.notificationEvents);

  return {
    payment: result.payment,
    totalGenerated: result.totalGenerated,
    withdrawalAmount: result.withdrawalAmount,
    weekNumber: result.weekNumber
  };
}

function getTotalGenerated(input: { principalAmount: number; referrals: Array<{ referredAmount: number }>; levelRule?: InvestorLevelRule }) {
  const levelRule = input.levelRule ?? investorLevelRules[1];
  const earningBase = getLevelEarningBase(input.principalAmount, levelRule);
  const referralBonus = roundMoney(input.referrals.reduce((total, referral) => total + referral.referredAmount * levelRule.bonusRate, 0));
  const referralYield = roundMoney(input.referrals.reduce((total, referral) => total + Math.min(referral.referredAmount, earningBase) * levelRule.yieldRate, 0));

  return roundMoney(input.principalAmount + referralBonus + referralYield);
}

function getLevelEarningBase(baseAmount: number, levelRule: InvestorLevelRule) {
  if (levelRule.investmentLimit <= 0) {
    return 0;
  }

  return roundMoney(Math.min(baseAmount, levelRule.investmentLimit));
}

function buildInvestmentWeeks(investment: WeeklyInvestmentInput, levelRule: InvestorLevelRule = investorLevelRules[0]) {
  const paidWeeks = investment.payments.length;
  const visibleWeeks = Math.min(config.defaultBusinessRules.totalCycleWeeks, Math.max(1, paidWeeks + 1));

  return Array.from({ length: visibleWeeks }, (_, index) => {
    const weekNumber = index + 1;
    const baseAmount =
      weekNumber === 1 ? Number(investment.principalAmount) : getReinvestedAmount(investment.payments[weekNumber - 2]?.notes);
    const weeklyReferralAmounts = investment.referralsSource.map((referral) => {
      const referredInvestment = referral.referredInvestor.investments[0];

      if (!referredInvestment) {
        return 0;
      }

      if (weekNumber === 1) {
        return Number(referredInvestment.principalAmount);
      }

      return getReinvestedAmount(referredInvestment.payments[weekNumber - 2]?.notes);
    });
    const linkedReferrals = investment.referralsSource.length;
    const weeklyQualifiedReferrals = weeklyReferralAmounts.filter((amount) => amount > 0).length;
    const earningBase = getLevelEarningBase(baseAmount, levelRule);
    const weeklyBonus = roundMoney(weeklyReferralAmounts.reduce((total, amount) => total + amount * levelRule.bonusRate, 0));
    const weeklyYield = roundMoney(
      weeklyReferralAmounts.reduce((total, amount) => total + Math.min(amount, earningBase) * levelRule.yieldRate, 0)
    );
    const totalGenerated = roundMoney(baseAmount + weeklyBonus + weeklyYield);

    return {
      baseAmount,
      canCollect: baseAmount > 0 && linkedReferrals >= 2 && weeklyQualifiedReferrals === linkedReferrals,
      paymentAt: addDays(investment.createdAt, weekNumber * config.defaultBusinessRules.cycleDays),
      startAt: addDays(investment.createdAt, (weekNumber - 1) * config.defaultBusinessRules.cycleDays),
      totalGenerated,
      weeklyBonus,
      weeklyQualifiedReferrals,
      weeklyYield,
      weekNumber
    };
  });
}

function getReinvestedAmount(notes?: string | null) {
  const match = notes?.match(/reinvertido\s+([0-9]+(?:\.[0-9]+)?)/i);
  return match ? Number(match[1]) : 0;
}

async function getInvestorLevelRule(tx: Prisma.TransactionClient, investorId: string) {
  const level = await getInvestorLevelSnapshot(tx, investorId);

  return getLevelRule(level.current.key);
}

async function getInvestorLevelSnapshot(tx: Prisma.TransactionClient, investorId: string) {
  const investments = await tx.investment.findMany({
    select: {
      payments: {
        select: { id: true }
      },
      principalAmount: true,
      referralsSource: {
        select: {
          referredInvestor: {
            select: {
              investments: {
                select: { id: true },
                take: 1
              }
            }
          }
        }
      },
      status: true
    },
    where: { investorId }
  });

  return buildInvestorLevel(investments);
}

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

async function createInvestmentGroup(tx: Prisma.TransactionClient) {
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

function buildInvestorLevel(investments: Array<{
  principalAmount: unknown;
  payments?: unknown[];
  referralsSource?: Array<{ referredInvestor?: { investments?: unknown[] } }>;
  status?: string;
}>) {
  const investmentCount = investments.length;
  const completedCycles = investments.filter((investment) =>
    investment.status === "PAID" || (investment.payments?.length ?? 0) >= config.defaultBusinessRules.totalCycleWeeks
  ).length;
  const totalInvested = roundMoney(investments.reduce((total, investment) => total + Number(investment.principalAmount ?? 0), 0));
  const totalReferrals = investments.reduce(
    (total, investment) =>
      total + (investment.referralsSource ?? []).filter((referral) => (referral.referredInvestor?.investments?.length ?? 0) > 0).length,
    0
  );
  let index = 0;

  for (let candidateIndex = 1; candidateIndex < investorLevelRules.length; candidateIndex += 1) {
    const candidate = investorLevelRules[candidateIndex];
    const meetsFirstInvestment = candidate.key === "starter" ? investmentCount >= 1 : true;
    const meetsRequirements =
      meetsFirstInvestment &&
      completedCycles >= candidate.completedCycles &&
      totalInvested >= candidate.minInvested &&
      totalReferrals >= candidate.activeReferrals;

    if (meetsRequirements) {
      index = candidateIndex;
    }
  }

  const nextProgress = getLevelProgress(index, {
    completedCycles,
    investmentCount,
    totalInvested,
    totalReferrals
  });

  return {
    completedCycles,
    current: formatLevelRule(investorLevelRules[index]),
    next: investorLevelRules[index + 1] ? formatLevelRule(investorLevelRules[index + 1]) : null,
    progressToNext: nextProgress,
    totalInvested,
    totalReferrals
  };
}

function getLevelProgress(index: number, stats: {
  completedCycles: number;
  investmentCount: number;
  totalInvested: number;
  totalReferrals: number;
}) {
  if (index >= investorLevelRules.length - 1) return 100;
  if (index === 0) return stats.investmentCount > 0 ? 100 : 0;
  const next = investorLevelRules[index + 1];
  const cycleProgress = next.completedCycles > 0 ? stats.completedCycles / next.completedCycles : 1;
  const investedProgress = next.minInvested > 0 ? stats.totalInvested / next.minInvested : 1;
  const referralProgress = next.activeReferrals > 0 ? stats.totalReferrals / next.activeReferrals : 1;

  return clampPercent(Math.min(cycleProgress, investedProgress, referralProgress) * 100);
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getLevelRule(levelKey: string) {
  return investorLevelRules.find((level) => level.key === levelKey) ?? investorLevelRules[0];
}

function formatLevelRule(levelRule: InvestorLevelRule) {
  return {
    key: levelRule.key,
    name: levelRule.name,
    requirement: levelRule.requirement
  };
}

function generateBase32Secret() {
  return base32Encode(randomBytes(20));
}

function buildOtpAuthUrl(email: string, secret: string) {
  const issuer = "XSPIN Financial";
  const label = `${issuer}:${email}`;

  return `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

function verifyTotpCode(secret: string, code: string) {
  const cleanSecret = normalizeBase32Secret(secret);
  const currentCounter = Math.floor(Date.now() / 1000 / 30);

  return [-1, 0, 1].some((offset) => {
    const expected = generateTotpCode(cleanSecret, currentCounter + offset);

    return safeCompare(expected, code);
  });
}

function generateTotpCode(secret: string, counter: number) {
  const key = base32Decode(secret);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac("sha1", key).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0xf;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binary % 1000000).padStart(6, "0");
}

function safeCompare(expected: string, received: string) {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

function base32Encode(buffer: Buffer) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  let output = "";

  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, "0");
  }

  for (let index = 0; index < bits.length; index += 5) {
    const chunk = bits.slice(index, index + 5).padEnd(5, "0");
    output += alphabet[Number.parseInt(chunk, 2)];
  }

  return output;
}

function base32Decode(value: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = normalizeBase32Secret(value);
  let bits = "";

  for (const character of clean) {
    const index = alphabet.indexOf(character);

    if (index === -1) {
      throw new Error("Clave 2FA invalida.");
    }

    bits += index.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];

  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }

  return Buffer.from(bytes);
}

function normalizeBase32Secret(value: string) {
  return value.replace(/[\s=]/g, "").toUpperCase();
}

function parseReferralTarget(referredByCode?: string, sourceInvestmentId?: string) {
  if (!referredByCode) {
    return { referredByCode, sourceInvestmentId };
  }

  const [investorCode, embeddedInvestmentId] = referredByCode.split(/-(.+)/);

  return {
    referredByCode: investorCode,
    sourceInvestmentId: sourceInvestmentId ?? embeddedInvestmentId
  };
}

function getStripePaymentNote(sessionId: string) {
  return `stripe_checkout_session:${sessionId}`;
}

function formatPayoutMethod(method: {
  accountHolder: string | null;
  bankName: string | null;
  clabe: string | null;
  coin: string | null;
  createdAt: Date;
  email: string | null;
  id: string;
  isPrimary: boolean;
  paxumAccount: string | null;
  type: "BANK" | "PAYPAL" | "PAXUM" | "CRYPTO";
  walletAddress: string | null;
}) {
  return {
    accountHolder: method.accountHolder ?? undefined,
    bankName: method.bankName ?? undefined,
    clabe: method.clabe ?? undefined,
    coin: method.coin ?? undefined,
    createdAt: method.createdAt,
    email: method.email ?? undefined,
    id: method.id,
    isPrimary: method.isPrimary,
    paxumAccount: method.paxumAccount ?? undefined,
    type: method.type.toLowerCase(),
    walletAddress: method.walletAddress ?? undefined
  };
}

function formatInvestorProfile(investor: {
  address?: string | null;
  birthDate?: Date | null;
  city?: string | null;
  country?: string | null;
  email?: string | null;
  fullName?: string | null;
  phone?: string | null;
}) {
  return {
    address: investor.address ?? "",
    birthDate: investor.birthDate ? investor.birthDate.toISOString().slice(0, 10) : "",
    city: investor.city ?? "",
    country: investor.country ?? "MX",
    email: investor.email ?? "",
    fullName: investor.fullName ?? "",
    phone: investor.phone ?? ""
  };
}

function formatIdentityVerification(identity: {
  officialIdBack?: string | null;
  officialIdFront?: string | null;
  proofOfAddressFile?: string | null;
  proofOfAddressFileName?: string | null;
  proofOfAddressMimeType?: string | null;
  proofOfAddressStatus?: string;
  proofOfAddressSubmittedAt?: Date | null;
  selfieImage?: string | null;
  selfieStatus?: string;
  selfieSubmittedAt?: Date | null;
  status?: string;
  submittedAt?: Date | null;
  updatedAt?: Date;
} | null) {
  return {
    backImage: identity?.officialIdBack ?? "",
    frontImage: identity?.officialIdFront ?? "",
    proofOfAddressFile: identity?.proofOfAddressFile ?? "",
    proofOfAddressFileName: identity?.proofOfAddressFileName ?? "",
    proofOfAddressMimeType: identity?.proofOfAddressMimeType ?? "",
    proofOfAddressStatus: identity?.proofOfAddressStatus ?? "PENDING",
    proofOfAddressSubmittedAt: identity?.proofOfAddressSubmittedAt?.toISOString() ?? "",
    selfieImage: identity?.selfieImage ?? "",
    selfieStatus: identity?.selfieStatus ?? "PENDING",
    selfieSubmittedAt: identity?.selfieSubmittedAt?.toISOString() ?? "",
    status: identity?.status ?? "PENDING",
    submittedAt: identity?.submittedAt?.toISOString() ?? "",
    updatedAt: identity?.updatedAt?.toISOString() ?? ""
  };
}

function formatInvestorSecurity(investor: {
  createdAt?: Date;
  email?: string | null;
  twoFactorEnabled?: boolean;
  updatedAt?: Date;
} | null, email: string) {
  const now = new Date();
  const createdAt = investor?.createdAt ?? now;
  const updatedAt = investor?.updatedAt ?? now;

  return {
    activity: [
      {
        description: "Acceso autorizado mediante Google OAuth.",
        id: "login",
        label: "Inicio de sesion",
        occurredAt: now.toISOString()
      },
      {
        description: "Ultima actualizacion registrada en tu perfil.",
        id: "profile",
        label: "Perfil actualizado",
        occurredAt: updatedAt.toISOString()
      },
      {
        description: "Cuenta creada en XSPIN Financial.",
        id: "created",
        label: "Cuenta creada",
        occurredAt: createdAt.toISOString()
      }
    ],
    sessions: [
      {
        browser: "Navegador actual",
        device: "Sesion web",
        email: investor?.email ?? email,
        id: "current-session",
        lastActiveAt: now.toISOString(),
        status: "Activa"
      }
    ],
    twoFactorEnabled: investor?.twoFactorEnabled ?? false
  };
}

function parseProfileDate(value?: string) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function cleanOptional(value?: string) {
  const clean = value?.trim();
  return clean ? clean : undefined;
}

function cleanNullable(value?: string) {
  const clean = value?.trim();
  return clean ? clean : null;
}

async function stripeRequest<T>(path: string, payload?: Record<string, string>, method: "GET" | "POST" = "POST") {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    body: method === "POST" ? new URLSearchParams(payload) : undefined,
    headers: {
      Authorization: `Bearer ${config.stripeSecretKey}`,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {})
    },
    method
  });

  const data = (await response.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;

  if (!response.ok) {
    throw new Error(data?.error?.message ?? "Stripe no pudo procesar la solicitud.");
  }

  if (!data) {
    throw new Error("Stripe regreso una respuesta vacia.");
  }

  return data;
}

async function readJson(req: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const body = Buffer.concat(chunks).toString("utf8");
  return body ? JSON.parse(body) : {};
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json"
  });
  res.end(JSON.stringify(payload));
}

function setCorsHeaders(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
}
