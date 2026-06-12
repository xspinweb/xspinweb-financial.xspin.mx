"use client";

import { useEffect, useMemo, useState } from "react";
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
  } | null;
  investments: Investment[];
};

const projectionWeeks = 8;
const projectionReinvestRate = 0.82;
const projectionReferralBonusRate = 0.05;
const projectionReferralYieldRate = 0.27;

export function InvestorDashboard({ userEmail, userName }: InvestorDashboardProps) {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [investorCode, setInvestorCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvestmentId, setSelectedInvestmentId] = useState("");
  const [selectedWeekNumber, setSelectedWeekNumber] = useState(1);

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
      .sort((current, next) => getTime(current.investedAtIso) - getTime(next.investedAtIso))
      .map((investment, index) => ({
        ...investment,
        group: `Grupo ${index + 1}`
      }));

    setInvestorCode(portfolio.investor?.code ?? "");
    setInvestments(sortedInvestments);
    setSelectedInvestmentId((currentId) =>
      sortedInvestments.some((investment) => investment.id === currentId) ? currentId : sortedInvestments[0]?.id ?? ""
    );
    setIsLoading(false);
  }

  const primaryInvestment = investments.find((investment) => investment.id === selectedInvestmentId) ?? investments[0];
  const primaryWeeks = primaryInvestment?.weeks ?? [];
  const currentPrimaryWeek = getCurrentInvestmentWeek(primaryInvestment);
  const selectedWeek = primaryWeeks.find((week) => week.weekNumber === selectedWeekNumber) ?? currentPrimaryWeek ?? primaryWeeks[0];
  const projectedWeeks = buildPortfolioProjection(investments);
  const totalInvested = roundMoney(investments.reduce((total, investment) => total + investment.amount, 0));
  const projectedBalance = projectedWeeks.at(-1)?.totalGenerated ?? totalInvested;
  const totalGains = roundMoney(Math.max(projectedBalance - totalInvested, 0));
  const projectedReturn =
    totalInvested > 0 && projectedBalance > totalInvested
      ? Math.round((totalGains / totalInvested) * 100)
      : 0;
  const totalReferrals = investments.reduce(
    (total, investment) => total + investment.referrals.filter((referral) => referral.invested).length,
    0
  );

  const cards = useMemo(() => {
    return [
      { icon: "wallet", label: "Inversion total", value: formatCurrency(totalInvested) },
      { icon: "chart", label: "Ganancias totales", value: formatCurrency(totalGains) },
      { icon: "percent", label: "Rendimiento", value: `${projectedReturn}%` },
      { icon: "users", label: "Referidos totales", value: String(totalReferrals) }
    ];
  }, [projectedReturn, totalGains, totalInvested, totalReferrals]);

  useEffect(() => {
    setSelectedWeekNumber(currentPrimaryWeek?.weekNumber ?? primaryWeeks[0]?.weekNumber ?? 1);
  }, [primaryInvestment?.id, currentPrimaryWeek?.weekNumber, primaryWeeks]);

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
    <>
      <section className="dashboardGrowthGrid">
        <article className="growthBalanceCard">
          <div>
            <h2>Tu inversion esta creciendo</h2>
            <span>Saldo proyectado</span>
            <strong className="projectedBalanceValue">
              {formatCurrency(projectedBalance)} <small>MXN</small>
            </strong>
            <em>+{projectedReturn}% de rendimiento esperado</em>
          </div>
          <GrowthSparkline weeks={projectedWeeks} />
        </article>

        <article className="projectionPanel">
          <div className="panelTitle">
            <h2>Proyeccion de crecimiento</h2>
            <span>8 semanas</span>
            <a className="detailPill" href="#weekly-history">Ver detalle</a>
          </div>
          <div className="projectionContent">
            <ProjectionChart weeks={projectedWeeks} />
            <div className="projectionList">
              {projectedWeeks.length === 0 ? (
                <span className="emptyProjection">Sin semanas disponibles</span>
              ) : (
                projectedWeeks.map((week) => (
                  <div key={`projection-${week.weekNumber}`}>
                    <span>Semana {week.weekNumber}</span>
                    <strong>{formatCurrency(week.totalGenerated)}</strong>
                  </div>
                ))
              )}
            </div>
          </div>
        </article>
      </section>

      <section className="dashboardCards metricCards">
        {cards.map((card) => (
          <article className="dashboardCard metricCard" key={card.label}>
            <div className="metricIcon">
              <MetricIcon name={card.icon} />
            </div>
            <div>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </div>
          </article>
        ))}
      </section>

      <section className="dashboardMainGrid">
        <section className="investmentPanel">
          <div className="tableHeader">
            <div className="panelTitle">
              <ChartIcon />
              <h2>
                <span className="desktopSectionTitle">Mis inversiones</span>
                <span className="mobileSectionTitle">Mis grupos</span>
              </h2>
            </div>
            <NewInvestmentModal onInvestmentCreated={handleInvestmentCreated} />
          </div>

          {isLoading ? (
            <div className="emptyInvestments">
              <strong>Cargando inversiones</strong>
              <span>Estamos consultando tu tablero.</span>
            </div>
          ) : investments.length === 0 ? (
            <div className="emptyInvestments">
              <strong>Sin inversiones activas</strong>
              <span>Cuando realices una nueva inversion, aparecera aqui con su grupo, ciclo y fecha de proximo pago.</span>
            </div>
          ) : (
            <div className="investmentList">
              {investments.map((investment, index) => {
                const confirmedReferrals = investment.referrals.filter((referral) => referral.invested).length;
                const currentWeek = getCurrentInvestmentWeek(investment);
                const nextPaymentLabel = currentWeek?.paymentLabel ?? investment.nextPaymentAt;
                const currentWeekNumber = currentWeek?.weekNumber ?? 1;
                const cycleProgress = Math.round((currentWeekNumber / projectionWeeks) * 100);
                const currentTotalGenerated = currentWeek?.totalGenerated ?? investment.amount;
                const toneClass = ["groupToneGreen", "groupToneBlue", "groupTonePurple", "groupToneOrange"][index % 4];

                return (
                  <details className={`investmentItem ${toneClass} ${primaryInvestment?.id === investment.id ? "selectedInvestment" : ""}`} key={investment.id}>
                    <summary
                      onClick={(event) => {
                        if ((event.target as HTMLElement).closest("button,a")) {
                          return;
                        }

                        setSelectedInvestmentId(investment.id);

                        if (window.innerWidth <= 620) {
                          event.preventDefault();
                        }
                      }}
                    >
                      <div className="investmentSummaryMain">
                        <span>{investment.name}</span>
                        <strong>{investment.group}</strong>
                      </div>
                      <div className="investmentCycleCell">
                        <span>Ciclo</span>
                        <strong>{investment.cycle}</strong>
                      </div>
                      <div className="investmentDateCell">
                        <span>Fecha</span>
                        <strong>{investment.investedAt}</strong>
                      </div>
                      <div className="investmentReferralCell">
                        <span>Referidos</span>
                        <strong>{confirmedReferrals}</strong>
                      </div>
                      <div className="investmentPaymentCell">
                        <span>Proximo pago</span>
                        <strong>{nextPaymentLabel}</strong>
                      </div>
                      <div className="mobileCycleProgress">
                        <span>Progreso del ciclo</span>
                        <strong>Semana <em>{currentWeekNumber}</em> de {projectionWeeks}</strong>
                        <div className="cycleSegments" aria-hidden="true">
                          {Array.from({ length: projectionWeeks }, (_, index) => (
                            <span className={index < currentWeekNumber ? "active" : ""} key={`${investment.id}-segment-${index}`} />
                          ))}
                        </div>
                        <b>{cycleProgress}%</b>
                      </div>
                      <div className="mobileInvestmentStats">
                        <div>
                          <CalendarIcon />
                          <span>Proximo pago</span>
                          <strong>{nextPaymentLabel}</strong>
                        </div>
                        <div>
                          <InviteIcon />
                          <span>Referidos</span>
                          <strong>{confirmedReferrals} confirmados</strong>
                        </div>
                      </div>
                      <div className="mobileInvestmentTotal">
                        <span>Total generado</span>
                        <strong>{formatCurrency(currentTotalGenerated)}</strong>
                      </div>
                      <InviteReferralModal investmentId={investment.id} investorCode={investorCode} />
                    </summary>

                    <div className="referralPanel">
                      <details className="referralsAccordion">
                        <summary>
                          <strong>Referidos</strong>
                          <span>{investment.referrals.length}</span>
                        </summary>
                        {investment.referrals.length === 0 ? (
                          <p className="emptyReferralText">Aun no hay referidos vinculados a esta inversion.</p>
                        ) : (
                          <div className="referralList">
                            {investment.referrals.map((referral) => (
                              <div className="referralItem" key={`${investment.id}-${referral.name}`}>
                                <div>
                                  <strong>{referral.name}</strong>
                                  <span>{referral.investedAt}</span>
                                </div>
                                <span className={referral.invested ? "statusPill statusGreen" : "statusPill statusRed"}>
                                  {referral.invested ? "Confirmado" : "Pendiente"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </details>
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </section>

        <section className="investmentPanel weeklyPanel" id="weekly-history">
          <div className="tableHeader">
            <div className="panelTitle">
              <CalendarIcon />
              <h2>Historial semanal</h2>
            </div>
          </div>
          <div className="weekList weeklyTimeline">
            {primaryWeeks.length === 0 ? (
              <div className="emptyInvestments">
                <strong>Sin historial semanal</strong>
                <span>Las semanas apareceran cuando exista una inversion activa.</span>
              </div>
            ) : (
              <>
                <p>Consulta el detalle de tus semanas de inversion</p>
                <div className="weekSelector" aria-label="Seleccionar semana">
                  {primaryWeeks.map((week) => (
                    <button
                      className={week.weekNumber === selectedWeek?.weekNumber ? "active" : ""}
                      key={`${primaryInvestment?.id}-selector-${week.weekNumber}`}
                      type="button"
                      onClick={() => setSelectedWeekNumber(week.weekNumber)}
                    >
                      <strong>{week.weekNumber}</strong>
                      <span>de {projectionWeeks}</span>
                    </button>
                  ))}
                  {primaryWeeks.length < projectionWeeks ? (
                    <button className="weekSelectorNext" type="button" aria-label="Semanas futuras" disabled>
                      ›
                    </button>
                  ) : null}
                </div>

                {selectedWeek ? (
                  <article className="selectedWeekCard">
                    <header>
                      <h3>Semana {selectedWeek.weekNumber} de {projectionWeeks}</h3>
                      <span className={`statusPill ${selectedWeek.statusClass}`}>{selectedWeek.statusLabel}</span>
                    </header>

                    <div className="weekDateGrid">
                      <div>
                        <CalendarIcon />
                        <span>Inicio</span>
                        <strong>{selectedWeek.startLabel}</strong>
                      </div>
                      <div>
                        <CalendarIcon />
                        <span>Pago</span>
                        <strong>{selectedWeek.paymentLabel}</strong>
                      </div>
                    </div>

                    <div className="weekMetricGrid">
                      <div>
                        <MetricIcon name="wallet" />
                        <span>Monto base</span>
                        <strong>{formatCurrency(selectedWeek.baseAmount)}</strong>
                      </div>
                      <div>
                        <MetricIcon name="users" />
                        <span>Referidos confirmados</span>
                        <strong>{primaryInvestment?.referrals.filter((referral) => referral.invested).length ?? 0}</strong>
                      </div>
                      <div>
                        <BonusIcon />
                        <span>Bono semanal</span>
                        <strong>{formatCurrency(selectedWeek.weeklyBonus)}</strong>
                      </div>
                      <div>
                        <MetricIcon name="chart" />
                        <span>Rendimiento calculado</span>
                        <strong>{formatCurrency(selectedWeek.weeklyYield)}</strong>
                      </div>
                      <div>
                        <MetricIcon name="wallet" />
                        <span>Total generado</span>
                        <strong>{formatCurrency(selectedWeek.totalGenerated)}</strong>
                      </div>
                      {selectedWeek.canReinvest && primaryInvestment ? (
                        <div className="weekActionCard">
                          <span>Reinversion</span>
                          <ReinvestmentModal
                            investmentId={primaryInvestment.id}
                            totalGenerated={selectedWeek.totalGenerated}
                            weekNumber={selectedWeek.weekNumber}
                            onCompleted={loadPortfolio}
                          />
                        </div>
                      ) : null}
                    </div>

                    <p className="weekInfoNote">
                      El pago se realizara el {selectedWeek.paymentLabel}. Los montos pueden variar segun el rendimiento del ciclo.
                    </p>
                  </article>
                ) : null}
              </>
            )}
          </div>
        </section>
      </section>
    </>
  );
}

function buildTwelveWeekProjection(investment?: Investment): ProjectionWeek[] {
  if (!investment) {
    return [];
  }

  const visibleWeeks = investment.weeks ?? [];
  const weeksByNumber = new Map(visibleWeeks.map((week) => [week.weekNumber, week]));
  const initialBase = investment.amount || visibleWeeks[0]?.baseAmount || 0;
  let baseAmount = roundMoney(initialBase);
  let referralMovement = getInitialReferralMovement(investment, visibleWeeks, initialBase);

  return Array.from({ length: projectionWeeks }, (_, index) => {
    const weekNumber = index + 1;
    const actualWeek = weeksByNumber.get(weekNumber);

    if (actualWeek) {
      if (actualWeek.weeklyBonus > 0) {
        referralMovement = roundMoney(actualWeek.weeklyBonus / projectionReferralBonusRate);
      }

      if (weekNumber < projectionWeeks) {
        baseAmount = roundMoney(actualWeek.totalGenerated * projectionReinvestRate);
        referralMovement = projectNextReferralMovement(referralMovement);
      }

      return {
        totalGenerated: actualWeek.totalGenerated,
        weekNumber
      };
    }

    const totalGenerated = calculateProjectedWeekTotal(baseAmount, referralMovement);

    if (weekNumber < projectionWeeks) {
      baseAmount = roundMoney(totalGenerated * projectionReinvestRate);
      referralMovement = projectNextReferralMovement(referralMovement);
    }

    return {
      totalGenerated,
      weekNumber
    };
  });
}

function buildPortfolioProjection(investments: Investment[]): ProjectionWeek[] {
  if (investments.length === 0) {
    return [];
  }

  const projections = investments.map(buildTwelveWeekProjection);

  return Array.from({ length: projectionWeeks }, (_, index) => ({
    totalGenerated: roundMoney(
      projections.reduce((total, projection) => total + (projection[index]?.totalGenerated ?? 0), 0)
    ),
    weekNumber: index + 1
  }));
}

function getInitialReferralMovement(investment: Investment, visibleWeeks: InvestmentWeek[], initialBase: number) {
  const weekWithBonus = visibleWeeks.find((week) => week.weeklyBonus > 0);

  if (weekWithBonus) {
    return roundMoney(weekWithBonus.weeklyBonus / projectionReferralBonusRate);
  }

  const confirmedReferralAmount = investment.referrals
    .filter((referral) => referral.invested)
    .reduce((total, referral) => total + (referral.amount ?? initialBase), 0);

  return roundMoney(confirmedReferralAmount > 0 ? confirmedReferralAmount : initialBase * 2);
}

function calculateProjectedWeekTotal(baseAmount: number, referralMovement: number) {
  const weeklyBonus = roundMoney(referralMovement * projectionReferralBonusRate);
  const rawYield = roundMoney(referralMovement * projectionReferralYieldRate);
  const cappedYield = rawYield > baseAmount ? roundMoney(baseAmount * 0.75) : rawYield;

  return roundMoney(baseAmount + weeklyBonus + cappedYield);
}

function projectNextReferralMovement(referralMovement: number) {
  const referralBasePerInvestor = roundMoney(referralMovement / 2);
  const referredInvestorTotal = calculateProjectedWeekTotal(referralBasePerInvestor, referralMovement);

  return roundMoney(referredInvestorTotal * projectionReinvestRate * 2);
}

function InviteReferralModal({ investmentId, investorCode }: { investmentId: string; investorCode: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedValue, setCopiedValue] = useState<"link" | "code" | null>(null);
  const [origin, setOrigin] = useState("");
  const referralCode = investorCode ? `${investorCode}-${investmentId}` : "PENDIENTE";
  const referralLink = `${origin || "https://pay.xspin.mx"}/dashboard?ref=${encodeURIComponent(referralCode)}&inv=${investmentId}`;

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

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
    await navigator.clipboard.writeText(value);
    setCopiedValue(type);
  }

  const modal = isOpen
    ? createPortal(
        <div className="modalOverlay" role="presentation">
          <section className="investmentModal" role="dialog" aria-modal="true" aria-labelledby={`invite-${investmentId}`}>
            <div className="inviteModalContent">
              <div className="modalHeader">
                <div>
                  <span className="loginEyebrow">Referidos</span>
                  <h2 id={`invite-${investmentId}`}>Invitar referido</h2>
                </div>
                <button className="modalClose" type="button" aria-label="Cerrar" onClick={closeModal}>
                  x
                </button>
              </div>

              <CopyBox
                label="Link de invitacion"
                value={referralLink}
                copied={copiedValue === "link"}
                onCopy={() => copyValue(referralLink, "link")}
              />
              <CopyBox
                label="Codigo de referido"
                value={referralCode}
                copied={copiedValue === "code"}
                onCopy={() => copyValue(referralCode, "code")}
              />
            </div>
          </section>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        className="inviteReferralAction"
        type="button"
        aria-label="Invitar referido"
        title="Invitar referido"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
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
  const padding = { bottom: 28, left: 18, right: 78, top: 30 };
  const points = getChartPoints(values, width, height, padding);
  const path = getSmoothPath(points);
  const last = points.at(-1);
  const areaPath = path ? `${path} L ${width - padding.right} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z` : "";
  const calloutLabel = formatChartCurrency(weeks.at(-1)?.totalGenerated ?? 0);
  const growthCallout = last ? getChartCallout(last, calloutLabel, width, height, { right: 10, top: 8 }, 74, -34) : null;

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
          {growthCallout ? (
            <g className="growthCallout">
              <rect x={growthCallout.x - growthCallout.width / 2} y={growthCallout.y} width={growthCallout.width} height="28" rx="8" />
              <text x={growthCallout.x} y={growthCallout.y + 19} textAnchor="middle">
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
                  <span>Retiro disponible</span>
                  <strong>{formatCurrency(withdrawalAmount)}</strong>
                </div>
              </div>

              {error ? <p className="modalError">{error}</p> : null}

              <div className="modalActions reinvestmentActions">
                <button className="secondaryModalAction" type="button" onClick={closeModal} disabled={isSubmitting}>
                  Cancelar
                </button>
                <button className="secondaryModalAction" type="button" disabled={isSubmitting || withdrawalAmount <= 0} onClick={submitReinvestment}>
                  Retiro
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

function ReinvestmentIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3a9 9 0 0 1 8.3 5.5l-1.9.8A7 7 0 0 0 6.1 7.9H9v2H3V4h2v2.2A9 9 0 0 1 12 3Zm6.9 10.7H15v-2h6v5.9h-2v-2.2A9 9 0 0 1 3.7 15.5l1.9-.8a7 7 0 0 0 12.3 1.4h-3v-2.4h4Z" />
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

function CopyBox({ copied, label, onCopy, value }: { copied: boolean; label: string; onCopy: () => void; value: string }) {
  return (
    <div className="copyBox">
      <span>{label}</span>
      <div>
        <strong>{value}</strong>
        <button type="button" onClick={onCopy}>
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

function InviteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.5 11.4a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4Zm0 2.3c-4.1 0-7.3 2.1-7.3 4.8V20h10.2a6.3 6.3 0 0 1-.4-2.2c0-1.4.5-2.8 1.3-3.8-1.1-.2-2.4-.3-3.8-.3Zm8.4-1a5.1 5.1 0 1 0 0 10.2 5.1 5.1 0 0 0 0-10.2Zm.8 2.5v2h2v1.6h-2v2h-1.6v-2h-2v-1.6h2v-2Z" />
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
  const today = new Date();
  const isPaid = week.weekNumber <= paidWeeks;
  const isComplete = today >= paymentDate;
  const canReinvest = week.weekNumber < projectionWeeks && week.canCollect && isComplete && !isPaid;

  return {
    ...week,
    canReinvest,
    paymentLabel: formatDate(paymentDate),
    startLabel: formatDate(startDate),
    statusClass: isPaid ? "statusGreen" : canReinvest ? "statusYellow" : "statusRed",
    statusLabel: isPaid ? "Cobrada" : canReinvest ? "Por cobrar" : "Pendiente"
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
