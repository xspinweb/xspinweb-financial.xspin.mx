"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { NewInvestmentModal } from "./new-investment-modal";

type Referral = {
  name: string;
  invested: boolean;
  investedAt: string;
  amount?: number;
};

type InvestmentWeek = {
  baseAmount: number;
  canCollect: boolean;
  canCollectFinal?: boolean;
  canReinvest?: boolean;
  paymentAt: string;
  paymentLabel?: string;
  startAt: string;
  startLabel?: string;
  statusClass?: string;
  statusLabel?: string;
  totalGenerated: number;
  weeklyBonus: number;
  weeklyQualifiedReferrals: number;
  weeklyYield: number;
  weekNumber: number;
};

type ProjectionWeek = {
  totalGenerated: number;
  weekNumber: number;
};

type ProjectionReferralState = {
  count: number;
  movement: number;
};

type Investment = {
  id: string;
  name: string;
  amount: number;
  group: string;
  cycle: string;
  investedAt: string;
  investedAtIso?: string;
  nextPaymentAt: string;
  nextPaymentAtIso?: string;
  paidWeeks?: number;
  referrals: Referral[];
  weeks?: InvestmentWeek[];
};

type InvestorDashboardProps = {
  userEmail: string;
  userName: string;
};

type PortfolioResponse = {
  investor: {
    code: string;
    level?: InvestorLevel;
  } | null;
  investments: Investment[];
};

type InvestorLevel = {
  current: {
    key: LevelKey;
    name: string;
    requirement: string;
  };
  next: {
    key: LevelKey;
    name: string;
    requirement: string;
  } | null;
  progressToNext: number;
};

type LevelKey = "explorer" | "starter" | "builder" | "elite" | "legend";

const projectionWeeks = 8;
const projectionReinvestRate = 0.82;
const projectionLevelRules = {
  explorer: { bonusRate: 0, investmentLimit: 0, yieldRate: 0 },
  starter: { bonusRate: 0.05, investmentLimit: 2000, yieldRate: 0.13 },
  builder: { bonusRate: 0.053, investmentLimit: 5000, yieldRate: 0.16 },
  elite: { bonusRate: 0.06, investmentLimit: 20000, yieldRate: 0.175 },
  legend: { bonusRate: 0.062, investmentLimit: 100000, yieldRate: 0.182 }
} satisfies Record<LevelKey, { bonusRate: number; investmentLimit: number; yieldRate: number }>;

export function InvestorDashboard({ userEmail, userName }: InvestorDashboardProps) {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [investorCode, setInvestorCode] = useState("");
  const [investorLevel, setInvestorLevel] = useState<InvestorLevel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvestmentId, setSelectedInvestmentId] = useState("");

  useEffect(() => {
    void loadPortfolio();
    const interval = window.setInterval(() => {
      void loadPortfolio();
    }, 10000);

    return () => window.clearInterval(interval);
  }, [userEmail]);

  useEffect(() => {
    void confirmCheckoutFromUrl();
  }, [userEmail]);

  async function loadPortfolio() {
    if (!userEmail) {
      setIsLoading(false);
      return;
    }

    const response = await fetch(`/api/investments/portfolio?email=${encodeURIComponent(userEmail)}`, {
      cache: "no-store"
    });
    const portfolio = (await response.json()) as PortfolioResponse;

    const sortedInvestments = portfolio.investments
      .map(normalizeInvestment)
      .sort((current, next) => getTime(current.investedAtIso) - getTime(next.investedAtIso));

    setInvestorCode(portfolio.investor?.code ?? "");
    setInvestorLevel(portfolio.investor?.level ?? null);
    setInvestments(sortedInvestments);
    setSelectedInvestmentId((currentId) =>
      sortedInvestments.some((investment) => investment.id === currentId) ? currentId : sortedInvestments[0]?.id ?? ""
    );
    setIsLoading(false);
  }

  const primaryInvestment = investments.find((investment) => investment.id === selectedInvestmentId) ?? investments[0];
  const currentPrimaryWeek = getCurrentInvestmentWeek(primaryInvestment);
  const projectionRule = projectionLevelRules[investorLevel?.current.key ?? "explorer"];
  const projectedWeeks = buildPortfolioProjection(investments, projectionRule);
  const totalInvested = roundMoney(investments.reduce((total, investment) => total + investment.amount, 0));
  const projectedBalance = projectedWeeks.at(-1)?.totalGenerated ?? totalInvested;
  const totalGains = roundMoney(Math.max(projectedBalance - totalInvested, 0));
  const projectedReturn =
    totalInvested > 0 && projectedBalance > totalInvested
      ? Math.round((totalGains / totalInvested) * 100)
      : 0;
  const totalReferrals = investments.reduce((total, investment) => total + investment.referrals.length, 0);

  const firstName = getFirstName(userName);
  const currentWeekNumber = currentPrimaryWeek?.weekNumber ?? 1;
  const cycleProgress = Math.round((currentWeekNumber / projectionWeeks) * 100);
  const cycleProjection = buildTwelveWeekProjection(primaryInvestment, projectionRule);
  const nextPaymentLabel = currentPrimaryWeek?.paymentLabel ?? primaryInvestment?.nextPaymentAt ?? "-";
  const nextPaymentAmount = currentPrimaryWeek?.totalGenerated ?? 0;
  const currentCycleLabel = primaryInvestment?.name ? `${primaryInvestment.name} ${currentWeekNumber} de ${projectionWeeks}` : "-";
  const kpiCards = [
    { accent: "green", icon: "wallet", label: "Invertido", helper: "Total invertido", value: formatCurrency(totalInvested) },
    { accent: "green", icon: "chart", label: "Proyectado", helper: "Ganancia acumulada", value: formatCurrency(totalGains) },
    { accent: "purple", icon: "users", label: "Referidos", helper: "Vinculados", value: String(totalReferrals) },
    { accent: "yellow", icon: "calendar", label: "Proximo pago", helper: getDaysUntilLabel(currentPrimaryWeek?.paymentAt), value: formatCurrency(nextPaymentAmount) }
  ];

  async function handleInvestmentCreated(amount: number) {
    if (!userEmail) {
      throw new Error("No se encontro el correo de tu sesion. Vuelve a iniciar sesion.");
    }

    const params = new URLSearchParams(window.location.search);
    const referralTarget = parseReferralTarget(params);
    const response = await fetch("/api/checkout/investment", {
      body: JSON.stringify({
        amount,
        email: userEmail,
        fullName: userName,
        referredByCode: referralTarget.referredByCode,
        sourceInvestmentId: referralTarget.sourceInvestmentId
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) {
      const message = await getResponseErrorMessage(response);
      throw new Error(message);
    }

    const checkout = (await response.json()) as { url?: string };

    if (!checkout.url) {
      throw new Error("No se pudo generar la liga de pago.");
    }

    window.location.assign(checkout.url);
  }

  async function confirmCheckoutFromUrl() {
    if (!userEmail) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    if (params.get("checkout") !== "success" || !sessionId) {
      return;
    }

    const response = await fetch("/api/checkout/confirm", {
      body: JSON.stringify({ sessionId }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    if (response.ok) {
      await loadPortfolio();
    }

    window.history.replaceState({}, "", window.location.pathname);
  }

  return (
    <section className="wealthDashboard">
      <div className="wealthIntro">
        <p>
          Hola, <strong>{firstName}</strong>
        </p>
        <h1>
          Tu patrimonio proyectado <InfoDot />
        </h1>
      </div>

      <article className="wealthHeroCard">
        <div className="wealthHeroCopy">
          <strong className="wealthAmount">
            {formatCurrency(projectedBalance)} <small>MXN</small>
          </strong>
          <span className="wealthReturn">
            +{projectedReturn}% <em>de rendimiento esperado</em>
          </span>
          <div className="wealthNextPayment">
            <CalendarIcon />
            <span>Proximo pago</span>
            <strong>{nextPaymentLabel}</strong>
          </div>
        </div>
        <GrowthSparkline weeks={projectedWeeks} />
      </article>

      {investorLevel ? <InvestorLevelStrip level={investorLevel} /> : null}

      <section className="wealthKpis" aria-label="Resumen financiero">
        {kpiCards.map((card) => (
          <article className={`wealthKpi wealthKpi-${card.accent}`} key={card.label}>
            <div className="wealthKpiIcon">
              <MetricIcon name={card.icon} />
            </div>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.helper}</small>
          </article>
        ))}
      </section>

      <section className="wealthGroupsPanel">
        <div className="wealthSectionHeader">
          <h2>Mis grupos de inversion</h2>
          <NewInvestmentModal onInvestmentCreated={handleInvestmentCreated} />
        </div>

        {isLoading ? (
          <div className="emptyInvestments compactEmpty">
            <strong>Cargando inversiones</strong>
            <span>Estamos consultando tu tablero.</span>
          </div>
        ) : investments.length === 0 ? (
          <div className="emptyInvestments compactEmpty">
            <strong>Sin inversiones activas</strong>
            <span>Cuando realices una nueva inversion, aparecera aqui con su grupo y ciclo.</span>
          </div>
        ) : (
          <div className="wealthGroupCarousel" aria-label="Grupos de inversion">
            {investments.map((investment, index) => {
              const currentWeek = getCurrentInvestmentWeek(investment);
              const weekNumber = currentWeek?.weekNumber ?? 1;
              const weeklyConfirmedReferrals = currentWeek?.weeklyQualifiedReferrals ?? 0;
              const weeklyPendingReferrals = Math.max(investment.referrals.length - weeklyConfirmedReferrals, 0);
              const referralSummary = formatReferralSummary(weeklyConfirmedReferrals, weeklyPendingReferrals);
              const progress = Math.round((weekNumber / projectionWeeks) * 100);
              const totalGenerated = currentWeek?.totalGenerated ?? investment.amount;
              const referralsClosed = (investment.paidWeeks ?? 0) >= 1;
              const tone = ["green", "blue", "purple", "orange"][index % 4];
              const selected = primaryInvestment?.id === investment.id;
              const groupStatus = currentWeek?.statusLabel ?? "Pendiente";
              const canCollect = Boolean(currentWeek?.canReinvest || currentWeek?.canCollectFinal);

              return (
                <article
                  className={`wealthGroupCard tone-${tone} ${selected ? "selected" : ""}`}
                  key={investment.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedInvestmentId(investment.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      setSelectedInvestmentId(investment.id);
                    }
                  }}
                >
                  <header>
                    <span className="wealthGroupIcon">
                      <BankIcon />
                    </span>
                    <div>
                      <strong>{investment.group}</strong>
                      <small>{investment.name}</small>
                    </div>
                    <InviteReferralModal
                      disabled={referralsClosed}
                      investmentId={investment.id}
                      investorCode={investorCode}
                    />
                  </header>

                  <span className={`groupStatus ${getGroupStatusClass(groupStatus)}`}>
                    {groupStatus}
                  </span>
                  <div className="groupProgressLine">
                    <div>
                      <span>Semana {weekNumber} de {projectionWeeks}</span>
                      <em>{progress}%</em>
                    </div>
                    <div className="cycleSegments" aria-hidden="true">
                      {Array.from({ length: projectionWeeks }, (_, segmentIndex) => (
                        <span className={segmentIndex < weekNumber ? "active" : ""} key={`${investment.id}-wealth-segment-${segmentIndex}`} />
                      ))}
                    </div>
                  </div>

                  <div className="groupCardMeta">
                    <div>
                      <CalendarIcon />
                      <span>Proximo pago</span>
                      <strong>{currentWeek?.paymentLabel ?? investment.nextPaymentAt}</strong>
                    </div>
                    <div>
                      <InviteIcon />
                      <span>Referidos</span>
                      <strong>{referralSummary}</strong>
                    </div>
                  </div>

                  <div className="groupCardTotal">
                    <span>Total generado</span>
                    <strong>{formatCurrency(totalGenerated)}</strong>
                  </div>
                  {canCollect && currentWeek ? (
                    <div className="groupCollectAction">
                      <div>
                        <span>Listo para cobrar</span>
                        <strong>{formatCurrency(currentWeek.totalGenerated)}</strong>
                      </div>
                      {currentWeek.canCollectFinal ? (
                        <FinalCollectModal
                          investmentId={investment.id}
                          totalGenerated={currentWeek.totalGenerated}
                          weekNumber={currentWeek.weekNumber}
                          onCompleted={loadPortfolio}
                        />
                      ) : (
                        <ReinvestmentModal
                          investmentId={investment.id}
                          totalGenerated={currentWeek.totalGenerated}
                          weekNumber={currentWeek.weekNumber}
                          onCompleted={loadPortfolio}
                        />
                      )}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="cycleStatusPanel">
        <h2>Estado del ciclo actual</h2>
        <div className="cycleStatusContent">
          <div className="cycleRingWrap">
            <div className="cycleRing" style={{ "--cycle-progress": `${cycleProgress * 3.6}deg` } as CSSProperties}>
              <div>
                <strong>{cycleProgress}%</strong>
                <span>Completado</span>
              </div>
            </div>
            <p>{currentCycleLabel}</p>
          </div>

          <div className="cycleWeekRows">
            {Array.from({ length: projectionWeeks }, (_, index) => {
              const weekNumber = index + 1;
              const week = cycleProjection[index];
              const isCompleted = weekNumber < currentWeekNumber;
              const isCurrent = weekNumber === currentWeekNumber;
              const status = isCompleted ? "Completada" : isCurrent ? "Actual" : "Pendiente";

              return (
                <div
                  className={`cycleWeekRow ${isCompleted ? "completed" : ""} ${isCurrent ? "current" : ""}`}
                  key={`cycle-status-${weekNumber}`}
                >
                  <span className="cycleWeekMarker" aria-hidden="true" />
                  <span>Semana {weekNumber}</span>
                  <strong>{status}</strong>
                  <b>{formatCurrency(week?.totalGenerated ?? 0)}</b>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </section>
  );
}

function InvestorLevelStrip({ level }: { level: InvestorLevel }) {
  return (
    <section className={`investorLevelStrip level-${level.current.key}`}>
      <div className="investorLevelBadge">
        <img src={`/badges/${level.current.key}-v2.png`} alt={`Insignia ${level.current.name}`} />
      </div>
      <div className="investorLevelCopy">
        <span>NIVEL</span>
        <strong>{level.current.name}</strong>
      </div>
    </section>
  );
}

function buildTwelveWeekProjection(
  investment: Investment | undefined,
  projectionRule: { bonusRate: number; investmentLimit: number; yieldRate: number }
): ProjectionWeek[] {
  if (!investment) {
    return [];
  }

  const visibleWeeks = investment.weeks ?? [];
  const weeksByNumber = new Map(visibleWeeks.map((week) => [week.weekNumber, week]));
  const initialBase = investment.amount || visibleWeeks[0]?.baseAmount || 0;
  let baseAmount = roundMoney(initialBase);
  let referralState = getInitialReferralState(investment, visibleWeeks, initialBase, projectionRule);

  return Array.from({ length: projectionWeeks }, (_, index) => {
    const weekNumber = index + 1;
    const actualWeek = weeksByNumber.get(weekNumber);

    if (actualWeek) {
      if (actualWeek.weeklyBonus > 0) {
        referralState = {
          count: Math.max(1, actualWeek.weeklyQualifiedReferrals),
          movement: projectionRule.bonusRate > 0 ? roundMoney(actualWeek.weeklyBonus / projectionRule.bonusRate) : 0
        };
      }

      if (weekNumber < projectionWeeks) {
        baseAmount = roundMoney(actualWeek.totalGenerated * projectionReinvestRate);
        referralState = projectNextReferralState(referralState, projectionRule);
      }

      return {
        totalGenerated: actualWeek.totalGenerated,
        weekNumber
      };
    }

    const totalGenerated = calculateProjectedWeekTotal(baseAmount, referralState, projectionRule);

    if (weekNumber < projectionWeeks) {
      baseAmount = roundMoney(totalGenerated * projectionReinvestRate);
      referralState = projectNextReferralState(referralState, projectionRule);
    }

    return {
      totalGenerated,
      weekNumber
    };
  });
}

function buildPortfolioProjection(
  investments: Investment[],
  projectionRule: { bonusRate: number; investmentLimit: number; yieldRate: number }
): ProjectionWeek[] {
  if (investments.length === 0) {
    return [];
  }

  const projections = investments.map((investment) => buildTwelveWeekProjection(investment, projectionRule));

  return Array.from({ length: projectionWeeks }, (_, index) => ({
    totalGenerated: roundMoney(
      projections.reduce((total, projection) => total + (projection[index]?.totalGenerated ?? 0), 0)
    ),
    weekNumber: index + 1
  }));
}

function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Usuario";
}

function getDaysUntilLabel(dateValue?: string) {
  if (!dateValue) {
    return "Sin fecha";
  }

  const today = startOfDay(new Date());
  const target = startOfDay(new Date(dateValue));

  const days = Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86400000));

  if (days === 0) {
    return "Hoy";
  }

  if (days === 1) {
    return "En 1 dia";
  }

  return `En ${days} dias`;
}

function getGroupStatusClass(statusLabel: string) {
  if (statusLabel === "Cobrada") {
    return "collected";
  }

  if (statusLabel === "Por cobrar") {
    return "collectable";
  }

  return "pending";
}

function formatReferralSummary(confirmed: number, pending: number) {
  if (confirmed === 0 && pending === 0) {
    return "0 referidos";
  }

  if (confirmed === 0) {
    return `${pending} ${pending === 1 ? "pendiente" : "pendientes"}`;
  }

  if (pending === 0) {
    return `${confirmed} ${confirmed === 1 ? "confirmado" : "confirmados"}`;
  }

  return `${confirmed} ${confirmed === 1 ? "confirmado" : "confirmados"} / ${pending} ${pending === 1 ? "pendiente" : "pendientes"}`;
}

function InfoDot() {
  return (
    <span className="infoDot" aria-label="Informacion de proyeccion">
      i
    </span>
  );
}

function BankIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 10.2 12 4l9 6.2v1.5H3v-1.5Zm2 3h2v5H5v-5Zm4 0h2v5H9v-5Zm4 0h2v5h-2v-5Zm4 0h2v5h-2v-5ZM4 19.5h16V21H4v-1.5Z" />
    </svg>
  );
}

function getInitialReferralState(
  investment: Investment,
  visibleWeeks: InvestmentWeek[],
  initialBase: number,
  projectionRule: { bonusRate: number; investmentLimit: number; yieldRate: number }
): ProjectionReferralState {
  const weekWithBonus = visibleWeeks.find((week) => week.weeklyBonus > 0);

  if (weekWithBonus) {
    return {
      count: Math.max(1, weekWithBonus.weeklyQualifiedReferrals),
      movement: projectionRule.bonusRate > 0 ? roundMoney(weekWithBonus.weeklyBonus / projectionRule.bonusRate) : 0
    };
  }

  const confirmedReferrals = investment.referrals.filter((referral) => referral.invested);
  const confirmedReferralAmount = confirmedReferrals.reduce((total, referral) => total + (referral.amount ?? initialBase), 0);

  return {
    count: Math.max(1, confirmedReferrals.length || 2),
    movement: roundMoney(confirmedReferralAmount > 0 ? confirmedReferralAmount : initialBase * 2)
  };
}

function calculateProjectedWeekTotal(
  baseAmount: number,
  referralState: ProjectionReferralState,
  projectionRule: { bonusRate: number; investmentLimit: number; yieldRate: number }
) {
  const earningBase = projectionRule.investmentLimit > 0 ? Math.min(baseAmount, projectionRule.investmentLimit) : 0;
  const referralAmount = referralState.count > 0 ? referralState.movement / referralState.count : 0;
  const weeklyBonus = roundMoney(referralState.movement * projectionRule.bonusRate);
  const weeklyYield = roundMoney(
    referralState.count > 0
      ? Array.from({ length: referralState.count }, () => Math.min(referralAmount, earningBase)).reduce(
          (total, amount) => total + amount * projectionRule.yieldRate,
          0
        )
      : 0
  );

  return roundMoney(baseAmount + weeklyBonus + weeklyYield);
}

function projectNextReferralState(
  referralState: ProjectionReferralState,
  projectionRule: { bonusRate: number; investmentLimit: number; yieldRate: number }
) {
  const referralBasePerInvestor = roundMoney(referralState.movement / Math.max(1, referralState.count));
  const referredInvestorTotal = calculateProjectedWeekTotal(referralBasePerInvestor, referralState, projectionRule);

  return {
    count: referralState.count,
    movement: roundMoney(referredInvestorTotal * projectionReinvestRate * referralState.count)
  };
}

function InviteReferralModal({
  disabled = false,
  investmentId,
  investorCode
}: {
  disabled?: boolean;
  investmentId: string;
  investorCode: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedValue, setCopiedValue] = useState<"link" | "code" | null>(null);
  const referralCode = investorCode ? `${investorCode}-${investmentId}` : "PENDIENTE";
  const referralLink = `https://pay.xspin.mx/register?ref=${encodeURIComponent(referralCode)}`;
  const shareTitle = "Invitacion XSpin";
  const shareIntro = `Te invito a unirte a XSpin. Usa mi codigo ${referralCode} y comienza tu ciclo desde aqui:`;
  const shareMessage = `${shareIntro} ${referralLink}`;
  const encodedUrl = encodeURIComponent(referralLink);
  const encodedText = encodeURIComponent(shareIntro);
  const encodedMessage = encodeURIComponent(shareMessage);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  function closeModal() {
    setIsOpen(false);
    setCopiedValue(null);
  }

  async function copyValue(value: string, type: "link" | "code") {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
    }
    setCopiedValue(type);
    window.setTimeout(() => setCopiedValue(null), 1800);
  }

  function openShareUrl(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function shareNative() {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareMessage, title: shareTitle, url: referralLink });
        return;
      } catch {
        return;
      }
    }

    await copyValue(referralLink, "link");
  }

  const modal = isOpen
    ? createPortal(
        <div className="shareSheetOverlay" role="presentation" onClick={closeModal}>
          <section
            className="shareSheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`invite-${investmentId}`}
            onClick={(event) => event.stopPropagation()}
          >
            <button className="shareSheetHandle" type="button" aria-label="Cerrar invitacion" onClick={closeModal} />
            <button className="shareSheetClose" type="button" aria-label="Cerrar" onClick={closeModal}>
              x
            </button>

            <p className="shareSheetLabel" id={`invite-${investmentId}`}>
              Compartir con
            </p>

            <div className="shareActionGrid">
              <button className="shareActionButton tone-link" type="button" onClick={() => copyValue(referralLink, "link")}>
                <span className="shareActionIcon">
                  <LinkShareIcon />
                </span>
                <strong>{copiedValue === "link" ? "Copiado" : "Copiar enlace"}</strong>
              </button>
              <button className="shareActionButton tone-code" type="button" onClick={() => copyValue(referralCode, "code")}>
                <span className="shareActionIcon">
                  <CodeShareIcon />
                </span>
                <strong>{copiedValue === "code" ? "Copiado" : "Copiar codigo"}</strong>
              </button>
              <button className="shareActionButton tone-whatsapp" type="button" onClick={() => openShareUrl(`https://wa.me/?text=${encodedMessage}`)}>
                <span className="shareActionIcon">
                  <WhatsAppShareIcon />
                </span>
                <strong>WhatsApp</strong>
              </button>
              <button
                className="shareActionButton tone-telegram"
                type="button"
                onClick={() => openShareUrl(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`)}
              >
                <span className="shareActionIcon">
                  <TelegramShareIcon />
                </span>
                <strong>Telegram</strong>
              </button>
              <button className="shareActionButton tone-sms" type="button" onClick={() => (window.location.href = `sms:?&body=${encodedMessage}`)}>
                <span className="shareActionIcon">
                  <SmsShareIcon />
                </span>
                <strong>SMS</strong>
              </button>
              <button className="shareActionButton tone-facebook" type="button" onClick={() => openShareUrl(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`)}>
                <span className="shareActionIcon">
                  <FacebookShareIcon />
                </span>
                <strong>Facebook</strong>
              </button>
              <button className="shareActionButton tone-messenger" type="button" onClick={shareNative}>
                <span className="shareActionIcon">
                  <MessengerShareIcon />
                </span>
                <strong>Messenger</strong>
              </button>
              <button
                className="shareActionButton tone-email"
                type="button"
                onClick={() => (window.location.href = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodedMessage}`)}
              >
                <span className="shareActionIcon">
                  <EmailShareIcon />
                </span>
                <strong>Email</strong>
              </button>
              <button className="shareActionButton tone-more" type="button" onClick={shareNative}>
                <span className="shareActionIcon">
                  <MoreShareIcon />
                </span>
                <strong>Mas</strong>
              </button>
            </div>
          </section>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        className={disabled ? "inviteReferralAction inviteReferralActionDisabled" : "inviteReferralAction"}
        type="button"
        aria-label={disabled ? "Referidos cerrados" : "Invitar referido"}
        disabled={disabled}
        title={disabled ? "Este grupo ya cerro referidos" : "Invitar referido"}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (disabled) {
            return;
          }
          setIsOpen(true);
        }}
      >
        <InviteIcon />
        <span>Invitar</span>
      </button>
      {modal}
    </>
  );
}

function parseReferralTarget(params: URLSearchParams) {
  const rawCode = params.get("ref") ?? undefined;
  const explicitInvestmentId = params.get("inv") ?? undefined;

  if (!rawCode) {
    return { referredByCode: undefined, sourceInvestmentId: explicitInvestmentId };
  }

  const [referredByCode, embeddedInvestmentId] = rawCode.split(/-(.+)/);

  return {
    referredByCode,
    sourceInvestmentId: explicitInvestmentId ?? embeddedInvestmentId
  };
}

function GrowthSparkline({ weeks }: { weeks: ProjectionWeek[] }) {
  const width = 560;
  const height = 260;
  const values = getHeroChartValues(weeks);
  const padding = { bottom: 28, left: 18, right: 104, top: 34 };
  const points = getChartPoints(values, width, height, padding);
  const path = getSmoothPath(points);
  const last = points.at(-1);
  const areaPath = path ? `${path} L ${width - padding.right} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z` : "";
  const calloutLabel = formatChartCurrency(weeks.at(-1)?.totalGenerated ?? 0);
  const growthCallout = last ? getChartCallout(last, calloutLabel, width, height, { right: 18, top: 8 }, 82, -46) : null;
  const growthCalloutHeight = 34;

  return (
    <svg className="growthSparkline" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <defs>
        <linearGradient id="growthFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(53, 224, 161, 0.58)" />
          <stop offset="52%" stopColor="rgba(53, 224, 161, 0.2)" />
          <stop offset="100%" stopColor="rgba(53, 224, 161, 0)" />
        </linearGradient>
        <filter id="growthGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="pointGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="growthCalloutShadow" x="-30%" y="-80%" width="160%" height="260%">
          <feDropShadow dx="0" dy="7" floodColor="rgba(0, 0, 0, 0.62)" stdDeviation="7" />
          <feDropShadow dx="0" dy="0" floodColor="rgba(53, 224, 161, 0.38)" stdDeviation="5" />
        </filter>
      </defs>
      {path ? (
        <>
          <path d={areaPath} fill="url(#growthFill)" />
          <path className="growthLineHalo" d={path} fill="none" stroke="#35e0a1" strokeLinecap="round" strokeLinejoin="round" />
          <path d={path} fill="none" filter="url(#growthGlow)" stroke="#35e0a1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
          {points.map((point, index) => (
            <g filter="url(#pointGlow)" key={`growth-point-${index}`}>
              <circle cx={point.x} cy={point.y} fill="#35e0a1" opacity="0.28" r={index === points.length - 1 ? 10 : 7} />
              <circle cx={point.x} cy={point.y} fill="#f6fbff" r={index === points.length - 1 ? 5 : 3.3} />
            </g>
          ))}
          {growthCallout && last ? (
            <g className="growthCallout" filter="url(#growthCalloutShadow)">
              <path className="growthCalloutLeader" d={`M ${growthCallout.x} ${growthCallout.y + growthCalloutHeight} L ${last.x} ${Math.max(last.y - 10, 8)}`} />
              <rect x={growthCallout.x - growthCallout.width / 2} y={growthCallout.y} width={growthCallout.width} height={growthCalloutHeight} rx="10" />
              <text x={growthCallout.x} y={growthCallout.y + 22} textAnchor="middle">
                {calloutLabel}
              </text>
            </g>
          ) : null}
        </>
      ) : null}
    </svg>
  );
}

function getHeroChartValues(weeks: ProjectionWeek[]) {
  const projectedValues = weeks.map((week) => week.totalGenerated);

  if (projectedValues.length === 0) {
    return [];
  }

  return [0, ...projectedValues];
}

function ProjectionChart({ weeks }: { weeks: ProjectionWeek[] }) {
  const width = 520;
  const height = 250;
  const values = getVisualChartValues(weeks);
  const maxValue = Math.max(...values, 1);
  const axisMax = Math.max(500, Math.ceil(maxValue / 500) * 500);
  const padding = { bottom: 42, left: 64, right: 62, top: 34 };
  const points = getChartPoints(values, width, height, padding, axisMax);
  const path = getSmoothPath(points);
  const yTicks = Array.from({ length: 6 }).map((_, index) => Math.round((axisMax / 5) * index));
  const areaPath = path ? `${path} L ${width - padding.right} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z` : "";
  const last = points.at(-1);
  const calloutLabel = formatChartCurrency(weeks.at(-1)?.totalGenerated ?? 0);
  const projectionCallout = last ? getChartCallout(last, calloutLabel, width, height, { right: 8, top: 8 }) : null;

  return (
    <svg className="projectionChart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Proyeccion de crecimiento semanal">
      <defs>
        <filter id="projectionGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g className="projectionGrid">
        {yTicks.map((tick, index) => (
          <g key={`grid-h-${tick}`}>
            <path d={`M ${padding.left} ${height - padding.bottom - index * ((height - padding.bottom - padding.top) / 5)} H ${width - padding.right}`} />
            <text x="10" y={height - padding.bottom + 4 - index * ((height - padding.bottom - padding.top) / 5)}>
              {formatCompactCurrency(tick)}
            </text>
          </g>
        ))}
      </g>
      {path ? (
        <>
          <path d={areaPath} fill="rgba(53, 224, 161, 0.2)" />
          <path d={path} fill="none" filter="url(#projectionGlow)" stroke="#35e0a1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
          {points.map((point, index) => (
            <circle cx={point.x} cy={point.y} fill="#f6fbff" key={`projection-point-${index}`} r="4" />
          ))}
          {projectionCallout ? (
            <g className="projectionCallout">
              <rect x={projectionCallout.x - projectionCallout.width / 2} y={projectionCallout.y} width={projectionCallout.width} height="26" rx="8" />
              <text x={projectionCallout.x} y={projectionCallout.y + 18} textAnchor="middle">
                {calloutLabel}
              </text>
            </g>
          ) : null}
        </>
      ) : null}
      <g className="projectionAxis">
        {points.map((point, index) => (
          <text x={point.x} y={height - 16} key={`axis-${index}`} textAnchor="middle">
            {index + 1}
          </text>
        ))}
        <text x={width / 2} y={height - 1} textAnchor="middle">
          Semanas
        </text>
      </g>
    </svg>
  );
}

function getVisualChartValues(weeks: Array<{ totalGenerated: number }>) {
  const values = weeks.map((week) => week.totalGenerated);

  if (values.length >= 6) {
    return values;
  }

  const end = values.at(-1) ?? 0;
  const start = values[0] ?? end;
  const visualLength = 6;

  if (end <= 0) {
    return Array.from({ length: visualLength }, () => 0);
  }

  const visualStart = values.length <= 1 ? end * 0.42 : start;

  return Array.from({ length: visualLength }, (_, index) => {
    const progress = index / (visualLength - 1);
    const eased = progress * progress * (3 - 2 * progress);
    return visualStart + (end - visualStart) * eased;
  });
}

function getCurrentInvestmentWeek(investment?: Investment) {
  return investment?.weeks?.find((week) => week.statusLabel !== "Cobrada") ?? investment?.weeks?.at(-1);
}

function getChartPoints(
  values: number[],
  width: number,
  height: number,
  padding: { bottom: number; left: number; right: number; top: number },
  maxOverride?: number
) {
  if (values.length === 0) {
    return [];
  }

  const min = Math.min(0, ...values);
  const max = maxOverride ?? Math.max(...values, 1);
  const usableWidth = width - padding.left - padding.right;
  const usableHeight = height - padding.top - padding.bottom;

  return values.map((value, index) => ({
    x: padding.left + (values.length === 1 ? usableWidth : (index / (values.length - 1)) * usableWidth),
    y: padding.top + usableHeight - ((value - min) / (max - min || 1)) * usableHeight
  }));
}

function getChartCallout(
  point: { x: number; y: number },
  label: string,
  width: number,
  height: number,
  padding: { right: number; top: number },
  verticalOffset = 42,
  horizontalOffset = 0
) {
  const labelWidth = Math.max(76, label.length * 7.4 + 20);
  const x = clamp(point.x + horizontalOffset, labelWidth / 2 + 8, width - labelWidth / 2 - padding.right);
  const y = clamp(point.y - verticalOffset, padding.top, height - 34);

  return { width: labelWidth, x, y };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getSmoothPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  return points.reduce((path, point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }

    const previous = points[index - 1];
    const controlX = (previous.x + point.x) / 2;
    return `${path} C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, "");
}

function MetricIcon({ name }: { name: string }) {
  if (name === "users") {
    return <InviteIcon />;
  }

  if (name === "calendar") {
    return <CalendarIcon />;
  }

  if (name === "wallet") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H20v3H6c-.6 0-1 .4-1 1s.4 1 1 1h14a2 2 0 0 1 2 2v5a2.5 2.5 0 0 1-2.5 2.5h-14A2.5 2.5 0 0 1 3 17Zm14.7 6.2a1.6 1.6 0 1 0 0 3.2H20v-3.2Z" />
      </svg>
    );
  }

  if (name === "percent") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7.2 9.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4Zm0-2a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Zm9.6 14a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4Zm0-2a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4ZM18.9 3.7 5.3 20.1l-1.6-1.3L17.3 2.4Z" />
      </svg>
    );
  }

  return <ChartIcon />;
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 19h16v2H3V4h2Zm2-3.2 3.2-4 3 2.4 4.6-6.8 1.7 1.1-5.8 8.6-3.2-2.6-3.5 4.3Z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 2h2v3h6V2h2v3h3a1 1 0 0 1 1 1v15H3V6a1 1 0 0 1 1-1h3Zm12 8H5v9h14ZM5 8h14V7H5Zm2 4h3v3H7Zm5 0h3v3h-3Z" />
    </svg>
  );
}

function BonusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 7h-2.2A3.2 3.2 0 0 0 12 5.1 3.2 3.2 0 0 0 6.2 7H4a1 1 0 0 0-1 1v4h2v8h14v-8h2V8a1 1 0 0 0-1-1Zm-5.1-2c.7 0 1.2.5 1.2 1.1 0 .6-.5.9-1.7.9h-1.1c.4-1.3.9-2 1.6-2ZM9.1 5c.7 0 1.2.7 1.6 2H9.6C8.4 7 7.9 6.7 7.9 6.1 7.9 5.5 8.4 5 9.1 5ZM5 9h6v1H5Zm6 9H7v-6h4Zm6 0h-4v-6h4Zm2-8h-6V9h6Z" />
    </svg>
  );
}

function ReinvestmentModal({
  investmentId,
  onCompleted,
  totalGenerated,
  weekNumber
}: {
  investmentId: string;
  onCompleted: () => Promise<void>;
  totalGenerated: number;
  weekNumber: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [percent, setPercent] = useState(82);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const reinvestAmount = totalGenerated * (percent / 100);
  const withdrawalAmount = totalGenerated - reinvestAmount;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  function closeModal() {
    setIsOpen(false);
    setError("");
    setIsSubmitting(false);
  }

  async function submitReinvestment() {
    setError("");
    setIsSubmitting(true);

    const response = await fetch(`/api/investments/${investmentId}/reinvest`, {
      body: JSON.stringify({
        reinvestPercent: percent,
        weekNumber
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) {
      setError(await getResponseErrorMessage(response));
      setIsSubmitting(false);
      return;
    }

    await onCompleted();
    closeModal();
  }

  return (
    <>
      <button
        className="reinvestmentAction"
        type="button"
        aria-label="Abrir reinversion"
        title="Reinversion"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsOpen(true);
        }}
      >
        <ReinvestmentIcon />
      </button>

      {isOpen ? (
        <div className="modalOverlay" role="presentation">
          <section className="investmentModal reinvestmentModal" role="dialog" aria-modal="true" aria-labelledby={`reinvest-${investmentId}`}>
            <div className="reinvestmentContent">
              <div className="modalHeader">
                <div>
                  <span className="loginEyebrow">Reinversion</span>
                  <h2 id={`reinvest-${investmentId}`}>Ciclo {weekNumber} concluido</h2>
                </div>
                <button className="modalClose" type="button" aria-label="Cerrar" onClick={closeModal}>
                  x
                </button>
              </div>

              <p className="reinvestmentText">
                Se dara inicio al ciclo {weekNumber + 1}. La reinversion minima es del 82% y puedes seleccionar hasta el 100%.
              </p>

              <div className="reinvestmentSlider">
                <div>
                  <span>Porcentaje de reinversion</span>
                  <strong>{percent}%</strong>
                </div>
                <input
                  type="range"
                  min="82"
                  max="100"
                  step="1"
                  value={percent}
                  onChange={(event) => setPercent(Number(event.target.value))}
                />
              </div>

              <div className="reinvestmentGrid">
                <div>
                  <span>Total generado</span>
                  <strong>{formatCurrency(totalGenerated)}</strong>
                </div>
                <div>
                  <span>Reinversion</span>
                  <strong>{formatCurrency(reinvestAmount)}</strong>
                </div>
                <div>
                  <span>Saldo reservado</span>
                  <strong>{formatCurrency(withdrawalAmount)}</strong>
                </div>
              </div>

              {error ? <p className="modalError">{error}</p> : null}

              <div className="modalActions reinvestmentActions">
                <button className="secondaryModalAction" type="button" onClick={closeModal} disabled={isSubmitting}>
                  Cancelar
                </button>
                <button className="primaryModalAction" type="button" onClick={submitReinvestment} disabled={isSubmitting}>
                  {isSubmitting ? "Procesando" : "Reinvertir"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function FinalCollectModal({
  investmentId,
  onCompleted,
  totalGenerated,
  weekNumber
}: {
  investmentId: string;
  onCompleted: () => Promise<void>;
  totalGenerated: number;
  weekNumber: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  function closeModal() {
    setIsOpen(false);
    setError("");
    setIsSubmitting(false);
  }

  async function submitCollection() {
    setError("");
    setIsSubmitting(true);

    const response = await fetch(`/api/investments/${investmentId}/collect`, {
      body: JSON.stringify({
        weekNumber
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) {
      setError(await getResponseErrorMessage(response));
      setIsSubmitting(false);
      return;
    }

    await onCompleted();
    closeModal();
  }

  return (
    <>
      <button
        className="reinvestmentAction finalCollectAction"
        type="button"
        aria-label="Abrir cobro final"
        title="Cobro final"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsOpen(true);
        }}
      >
        <WalletIcon />
      </button>

      {isOpen ? (
        <div className="modalOverlay" role="presentation">
          <section className="investmentModal reinvestmentModal" role="dialog" aria-modal="true" aria-labelledby={`collect-${investmentId}`}>
            <div className="reinvestmentContent">
              <div className="modalHeader">
                <div>
                  <span className="loginEyebrow">Cobro final</span>
                  <h2 id={`collect-${investmentId}`}>Ciclo {weekNumber} concluido</h2>
                </div>
                <button className="modalClose" type="button" aria-label="Cerrar" onClick={closeModal}>
                  x
                </button>
              </div>

              <p className="reinvestmentText">
                Esta es la ultima semana del ciclo. El monto generado queda disponible para retiro total.
              </p>

              <div className="reinvestmentGrid finalCollectGrid">
                <div>
                  <span>Total generado</span>
                  <strong>{formatCurrency(totalGenerated)}</strong>
                </div>
                <div>
                  <span>Retiro disponible</span>
                  <strong>{formatCurrency(totalGenerated)}</strong>
                </div>
              </div>

              {error ? <p className="modalError">{error}</p> : null}

              <div className="modalActions reinvestmentActions">
                <button className="secondaryModalAction" type="button" onClick={closeModal} disabled={isSubmitting}>
                  Cancelar
                </button>
                <button className="primaryModalAction" type="button" onClick={submitCollection} disabled={isSubmitting}>
                  {isSubmitting ? "Procesando" : "Cobrar"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function ReinvestmentIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3a9 9 0 0 1 8.3 5.5l-1.9.8A7 7 0 0 0 6.1 7.9H9v2H3V4h2v2.2A9 9 0 0 1 12 3Zm6.9 10.7H15v-2h6v5.9h-2v-2.2A9 9 0 0 1 3.7 15.5l1.9-.8a7 7 0 0 0 12.3 1.4h-3v-2.4h4Z" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6h14a2 2 0 0 1 2 2v2h-5a4 4 0 0 0 0 8h5v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm0 2v11h14v-1h-3a6 6 0 0 1 0-12H4Zm11 4h7v4h-7a2 2 0 0 1 0-4Zm0 2v0a.5.5 0 0 0 0 1h1v-1Z" />
    </svg>
  );
}

function normalizeInvestment(investment: Investment): Investment {
  return {
    ...investment,
    investedAtIso: investment.investedAt,
    investedAt: formatDate(new Date(investment.investedAt)),
    nextPaymentAtIso: investment.nextPaymentAt,
    nextPaymentAt: formatDate(new Date(investment.nextPaymentAt)),
    referrals: investment.referrals.map((referral) => ({
      ...referral,
      investedAt: formatDate(new Date(referral.investedAt))
    })),
    weeks: investment.weeks
      ?.map((week) => normalizeInvestmentWeek(week, investment.paidWeeks ?? 0))
      .sort((current, next) => current.weekNumber - next.weekNumber)
  };
}

function InviteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.5 11.4a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4Zm0 2.3c-4.1 0-7.3 2.1-7.3 4.8V20h10.2a6.3 6.3 0 0 1-.4-2.2c0-1.4.5-2.8 1.3-3.8-1.1-.2-2.4-.3-3.8-.3Zm8.4-1a5.1 5.1 0 1 0 0 10.2 5.1 5.1 0 0 0 0-10.2Zm.8 2.5v2h2v1.6h-2v2h-1.6v-2h-2v-1.6h2v-2Z" />
    </svg>
  );
}

function LinkShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.2 14.8a1 1 0 0 1 0-1.4l4.2-4.2a1 1 0 1 1 1.4 1.4l-4.2 4.2a1 1 0 0 1-1.4 0Z" />
      <path d="M8.1 18.6a4.7 4.7 0 0 1-3.3-8l2.4-2.4a4.7 4.7 0 0 1 6.6 0 1 1 0 0 1-1.4 1.4 2.7 2.7 0 0 0-3.8 0l-2.4 2.4a2.7 2.7 0 0 0 3.8 3.8 1 1 0 1 1 1.4 1.4 4.6 4.6 0 0 1-3.3 1.4Zm5.7-2.8a4.7 4.7 0 0 1-3.3-1.4 1 1 0 1 1 1.4-1.4 2.7 2.7 0 0 0 3.8 0l2.4-2.4a2.7 2.7 0 0 0-3.8-3.8 1 1 0 0 1-1.4-1.4 4.7 4.7 0 0 1 6.6 6.6l-2.4 2.4a4.7 4.7 0 0 1-3.3 1.4Z" />
    </svg>
  );
}

function CodeShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h6v6H4V4Zm2 2v2h2V6H6Zm8-2h6v6h-6V4Zm2 2v2h2V6h-2ZM4 14h6v6H4v-6Zm2 2v2h2v-2H6Zm8-1h2v2h-2v-2Zm2 2h2v-2h2v4h-2v1h-4v-2h2v-1Z" />
    </svg>
  );
}

function WhatsAppShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.1a8.8 8.8 0 0 0-7.6 13.2L3.2 21l4.8-1.2A8.8 8.8 0 1 0 12 3.1Zm0 15.8a7 7 0 0 1-3.6-1l-.3-.2-2.5.7.7-2.4-.2-.4A7 7 0 1 1 12 18.9Zm3.8-5.2c-.2-.1-1.2-.6-1.4-.7-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a5.7 5.7 0 0 1-2.8-2.5c-.2-.2 0-.4.1-.5l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.7-1.6c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.7 2.7 4.2 3.7.6.3 1 .4 1.4.5.6.2 1.1.2 1.5.1.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1 0-.2-.2-.2-.4-.3Z" />
    </svg>
  );
}

function TelegramShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.8 4.2 3.9 10.7c-1.1.4-1.1 1.1-.2 1.4l4.3 1.3 1.7 5.2c.2.7.4 1 .8 1 .4 0 .6-.2.9-.5l2.1-2 4.4 3.2c.8.5 1.3.3 1.6-.8l2.8-13.3c.3-1.2-.4-1.7-1.5-1.2Zm-3.4 3.1-8 7.2-.3 3.1-1.2-4 9.2-5.8c.4-.3.8-.6.3-.5Z" />
    </svg>
  );
}

function SmsShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2h9A3.5 3.5 0 0 1 20 5.5v6a3.5 3.5 0 0 1-3.5 3.5H11l-5.2 4.4A1.1 1.1 0 0 1 4 18.5v-13Zm3.5-1.4A1.4 1.4 0 0 0 6.1 5.5v10.7l4.1-3.4h6.3a1.4 1.4 0 0 0 1.4-1.4v-6A1.4 1.4 0 0 0 16.5 4h-9Z" />
    </svg>
  );
}

function FacebookShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 8h2.5V4.2c-.4-.1-1.8-.2-3.4-.2-3.4 0-5.7 2.1-5.7 6v3.3H4v4.2h3.4V24h4.3v-6.5h3.4l.5-4.2h-3.9v-2.9C11.7 9.2 12 8 14 8Z" />
    </svg>
  );
}

function MessengerShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2C6.5 2 2.2 6 2.2 11.4c0 2.8 1.1 5.1 3 6.8v3.6l3.3-1.8c1.1.3 2.3.5 3.5.5 5.5 0 9.8-4 9.8-9.4S17.5 2 12 2Zm1 12.6-2.5-2.7-5 2.7 5.5-5.9 2.6 2.7 4.9-2.7-5.5 5.9Z" />
    </svg>
  );
}

function EmailShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 5h15A2.5 2.5 0 0 1 22 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 16.5v-9A2.5 2.5 0 0 1 4.5 5Zm0 2a.5.5 0 0 0-.5.5v.4l8 4.5 8-4.5v-.4a.5.5 0 0 0-.5-.5h-15Zm15 10a.5.5 0 0 0 .5-.5v-6.3l-7.5 4.2a1 1 0 0 1-1 0L4 10.2v6.3a.5.5 0 0 0 .5.5h15Z" />
    </svg>
  );
}

function MoreShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm5 0a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm5 0a2 2 0 1 1 4 0 2 2 0 0 1-4 0Z" />
    </svg>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  })
    .format(date)
    .replace(".", "");
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-MX", {
    currency: "MXN",
    style: "currency"
  }).format(amount);
}

function formatChartCurrency(amount: number) {
  return new Intl.NumberFormat("es-MX", {
    currency: "MXN",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(amount);
}

function roundMoney(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function getTime(value?: string) {
  return value ? new Date(value).getTime() : 0;
}

function startOfDay(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function formatCompactCurrency(amount: number) {
  if (amount >= 1000) {
    const value = amount / 1000;
    const formattedValue = new Intl.NumberFormat("es-MX", {
      maximumFractionDigits: value >= 10 || Number.isInteger(value) ? 0 : 1
    }).format(value);

    return `$${formattedValue}k`;
  }

  return formatChartCurrency(amount);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeInvestmentWeek(week: InvestmentWeek, paidWeeks: number): InvestmentWeek {
  const startDate = new Date(week.startAt);
  const paymentDate = new Date(week.paymentAt);
  const today = startOfDay(new Date());
  const isPaid = week.weekNumber <= paidWeeks;
  const isComplete = today >= startOfDay(paymentDate);
  const canReinvest = week.weekNumber < projectionWeeks && week.canCollect && isComplete && !isPaid;
  const canCollectFinal = week.weekNumber === projectionWeeks && week.canCollect && isComplete && !isPaid;

  return {
    ...week,
    canCollectFinal,
    canReinvest,
    paymentLabel: formatDate(paymentDate),
    startLabel: formatDate(startDate),
    statusClass: isPaid ? "statusGreen" : canReinvest || canCollectFinal ? "statusYellow" : "statusRed",
    statusLabel: isPaid ? "Cobrada" : canReinvest || canCollectFinal ? "Por cobrar" : "Pendiente"
  };
}

async function getResponseErrorMessage(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (payload?.error) {
      return payload.error;
    }
  }

  const text = await response.text().catch(() => "");
  const cleanText = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  if (cleanText) {
    return `Error ${response.status}: ${cleanText.slice(0, 160)}`;
  }

  return `Error ${response.status}: No se pudo registrar la inversion.`;
}
