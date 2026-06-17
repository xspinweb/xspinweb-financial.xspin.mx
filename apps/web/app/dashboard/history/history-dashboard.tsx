"use client";

import { useEffect, useMemo, useState } from "react";

type InvestmentWeek = {
  baseAmount: number;
  canCollect: boolean;
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

type Investment = {
  amount: number;
  group: string;
  id: string;
  investedAt: string;
  investedAtIso?: string;
  name: string;
  nextPaymentAt: string;
  referrals: Array<{ invested: boolean; name: string }>;
  weeks?: InvestmentWeek[];
};

type PortfolioResponse = {
  investments: Investment[];
};

type HistoryFilter = "all" | "payments" | "yield" | "bonus" | "referrals";

const totalCycleWeeks = 8;

export function HistoryDashboard({ userEmail }: { userEmail: string; userName: string }) {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<HistoryFilter>("all");

  useEffect(() => {
    let isCurrent = true;

    async function loadPortfolio() {
      if (!userEmail) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(`/api/investments/portfolio?email=${encodeURIComponent(userEmail)}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        setIsLoading(false);
        return;
      }

      const portfolio = (await response.json()) as PortfolioResponse;

      if (isCurrent) {
        setInvestments(portfolio.investments.map(normalizeInvestment));
        setIsLoading(false);
      }
    }

    void loadPortfolio();

    return () => {
      isCurrent = false;
    };
  }, [userEmail]);

  const weeks = useMemo(() => buildHistoryWeeks(investments), [investments]);
  const completedWeeks = weeks.filter((week) => week.state === "collected");
  const rendimientoTotal = roundMoney(completedWeeks.reduce((total, week) => total + week.weeklyYield, 0));
  const bonosTotal = roundMoney(completedWeeks.reduce((total, week) => total + week.weeklyBonus, 0));
  const referidosTotal = roundMoney(completedWeeks.reduce((total, week) => total + week.baseAmount, 0));
  const collectedTotal = roundMoney(completedWeeks.reduce((total, week) => total + week.totalGenerated, 0));
  const averageWeekly = completedWeeks.length ? roundMoney(collectedTotal / completedWeeks.length) : 0;
  const filteredWeeks = weeks.filter((week) => {
    if (filter === "payments") return week.state === "collected";
    if (filter === "yield") return week.weeklyYield > 0;
    if (filter === "bonus") return week.weeklyBonus > 0;
    if (filter === "referrals") return week.weeklyQualifiedReferrals > 0;
    return true;
  });

  return (
    <section className="historyDashboard">
      <header className="historyHeader">
        <span>Historial</span>
        <h1>Historial de rendimientos</h1>
        <p>Consulta pagos recibidos, rendimientos, bonos y semanas pendientes de tus inversiones.</p>
      </header>

      <section className="historySummaryGrid">
        <article className="historyChartCard">
          <div className="historyCardHeader">
            <h2>Resumen de rendimientos</h2>
            <div>
              <span>Rendimiento total</span>
              <strong>{formatCurrency(rendimientoTotal)}</strong>
            </div>
            <div>
              <span>Promedio semanal</span>
              <strong className="purple">{formatCurrency(averageWeekly)}</strong>
            </div>
          </div>
          <HistoryLineChart weeks={weeks} />
        </article>

        <article className="historyDistributionCard">
          <h2>Distribucion de ingresos</h2>
          <div className="historyDistributionContent">
            <DistributionDonut bonus={bonosTotal} principal={referidosTotal} total={collectedTotal} yieldAmount={rendimientoTotal} />
            <div className="historyDistributionLegend">
              <DistributionLegend color="green" label="Rendimiento" total={collectedTotal} value={rendimientoTotal} />
              <DistributionLegend color="purple" label="Bonos" total={collectedTotal} value={bonosTotal} />
              <DistributionLegend color="yellow" label="Referidos" total={collectedTotal} value={referidosTotal} />
            </div>
          </div>
          <a className="historyDetailLink" href="#history-table">Ver mas detalles <ArrowIcon /></a>
        </article>
      </section>

      <section className="historyTablePanel" id="history-table">
        <div className="historyToolbar">
          <div className="historyTabs" role="tablist" aria-label="Filtros de historial">
            {[
              ["all", "Todos"],
              ["payments", "Pagos recibidos"],
              ["yield", "Rendimientos"],
              ["bonus", "Bonos"],
              ["referrals", "Referidos"]
            ].map(([key, label]) => (
              <button className={filter === key ? "active" : ""} key={key} type="button" onClick={() => setFilter(key as HistoryFilter)}>
                {label}
              </button>
            ))}
          </div>
          <button className="historyDownloadButton" type="button">
            <DownloadIcon />
            Descargar reporte
          </button>
        </div>

        <div className="historyTableWrap">
          <table className="historyTable">
            <thead>
              <tr>
                <th>Semana</th>
                <th>Fecha inicio</th>
                <th>Fecha pago</th>
                <th>Estado</th>
                <th>Tipo</th>
                <th>Concepto</th>
                <th>Monto</th>
                <th>Rendimiento</th>
                <th>Bonos</th>
                <th>Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={11}>Cargando historial...</td>
                </tr>
              ) : filteredWeeks.length ? (
                filteredWeeks.map((week) => (
                  <tr key={`${week.investmentId}-${week.weekNumber}`}>
                    <td>
                      <span className={`historyWeekIcon ${week.state}`}><HistoryStateIcon state={week.state} /></span>
                      <strong>{week.weekNumber} de {totalCycleWeeks}</strong>
                    </td>
                    <td>{week.startLabel}</td>
                    <td>{week.paymentLabel}</td>
                    <td><span className={`historyStatus ${week.state}`}>{week.statusLabel}</span></td>
                    <td><span className="historyType"><HistoryTypeIcon state={week.state} /> {getHistoryTypeLabel(week)}</span></td>
                    <td>{week.state === "collected" ? "Pago semanal" : week.state === "current" ? "Rendimiento semanal" : "Proximo pago"}</td>
                    <td>{week.baseAmount > 0 ? formatCurrency(week.baseAmount) : "-"}</td>
                    <td>{week.weeklyYield > 0 ? formatCurrency(week.weeklyYield) : "-"}</td>
                    <td>{week.weeklyBonus > 0 ? formatCurrency(week.weeklyBonus) : "-"}</td>
                    <td><strong className={week.state === "current" ? "purple" : ""}>{week.totalGenerated > 0 ? formatCurrency(week.totalGenerated) : "-"}</strong></td>
                    <td><button className="historyViewButton" type="button" aria-label="Ver detalle"><EyeIcon /></button></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11}>Sin movimientos para este filtro.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function HistoryLineChart({ weeks }: { weeks: HistoryWeek[] }) {
  const width = 760;
  const height = 320;
  const values = weeks.map((week) => week.totalGenerated);
  const maxValue = Math.max(400, Math.ceil(Math.max(...values, 0) / 100) * 100);
  const padding = { bottom: 78, left: 52, right: 72, top: 44 };
  const points = values.map((value, index) => ({
    x: padding.left + (index / Math.max(weeks.length - 1, 1)) * (width - padding.left - padding.right),
    y: padding.top + (height - padding.top - padding.bottom) - (value / maxValue) * (height - padding.top - padding.bottom)
  }));
  const path = getSmoothPath(points);
  const last = points.at(-1);
  const lastWeek = weeks.at(-1);

  return (
    <svg className="historyLineChart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Resumen de rendimientos por semana">
      <defs>
        <linearGradient id="historyLineFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(53, 224, 161, 0.46)" />
          <stop offset="100%" stopColor="rgba(53, 224, 161, 0)" />
        </linearGradient>
        <filter id="historyGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
        const y = padding.top + (1 - tick) * (height - padding.top - padding.bottom);
        return (
          <g className="historyChartGrid" key={tick}>
            <path d={`M ${padding.left} ${y} H ${width - padding.right}`} />
            <text x="10" y={y + 4}>{formatCompactCurrency(maxValue * tick)}</text>
          </g>
        );
      })}
      {path ? (
        <>
          <path d={`${path} L ${width - padding.right} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`} fill="url(#historyLineFill)" />
          <path d={path} fill="none" filter="url(#historyGlow)" stroke="#35e0a1" strokeLinecap="round" strokeWidth="4" />
          {points.map((point, index) => <circle cx={point.x} cy={point.y} fill="#35e0a1" key={index} r="5" />)}
          {last && lastWeek ? (
            <g className="historyChartCallout">
              <rect x={Math.min(last.x + 18, width - 126)} y={Math.max(last.y - 38, 12)} width="108" height="66" rx="10" />
              <text x={Math.min(last.x + 72, width - 72)} y={Math.max(last.y - 14, 36)} textAnchor="middle">Semana {lastWeek.weekNumber}</text>
              <text x={Math.min(last.x + 72, width - 72)} y={Math.max(last.y + 13, 63)} textAnchor="middle">{formatCurrency(lastWeek.totalGenerated)}</text>
            </g>
          ) : null}
        </>
      ) : null}
      <g className="historyChartAxis">
        {weeks.map((week, index) => (
          <text key={week.weekNumber} transform={`translate(${points[index]?.x ?? 0} ${height - 26}) rotate(-45)`} textAnchor="end">
            Semana {week.weekNumber}
          </text>
        ))}
      </g>
    </svg>
  );
}

function DistributionDonut({ bonus, principal, total, yieldAmount }: { bonus: number; principal: number; total: number; yieldAmount: number }) {
  const safeTotal = Math.max(total, 1);
  const yieldDeg = (yieldAmount / safeTotal) * 360;
  const bonusDeg = (bonus / safeTotal) * 360;

  return (
    <div
      className="historyDonut"
      style={{
        background: `conic-gradient(var(--green) 0deg ${yieldDeg}deg, #a855f7 ${yieldDeg}deg ${yieldDeg + bonusDeg}deg, #facc15 ${yieldDeg + bonusDeg}deg 360deg)`
      }}
    >
      <div>
        <span>Total</span>
        <strong>{formatCurrency(total)}</strong>
        <em>MXN</em>
      </div>
    </div>
  );
}

function DistributionLegend({ color, label, total, value }: { color: "green" | "purple" | "yellow"; label: string; total: number; value: number }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className={`historyLegendItem ${color}`}>
      <i />
      <span>{label}</span>
      <strong>{formatCurrency(value)}</strong>
      <em>{percent}%</em>
    </div>
  );
}

type HistoryWeek = InvestmentWeek & {
  investmentId: string;
  state: "collected" | "current" | "pending";
  statusLabel: string;
};

function buildHistoryWeeks(investments: Investment[]) {
  const selected = investments[0];

  if (!selected) {
    return Array.from({ length: totalCycleWeeks }, (_, index) => buildEmptyWeek(index + 1, new Date()));
  }

  const visibleWeeks = selected.weeks ?? [];
  const startDate = getDateFromIso(selected.investedAtIso) ?? new Date();

  return Array.from({ length: totalCycleWeeks }, (_, index) => {
    const weekNumber = index + 1;
    const week = visibleWeeks.find((item) => item.weekNumber === weekNumber);

    if (week) {
      const state: HistoryWeek["state"] = week.statusLabel === "Cobrada" ? "collected" : week.statusLabel === "En curso" ? "current" : "pending";
      return {
        ...week,
        investmentId: selected.id,
        paymentLabel: week.paymentLabel ?? formatDateLabel(week.paymentAt),
        startLabel: week.startLabel ?? formatDateLabel(week.startAt),
        state,
        statusLabel: state === "collected" ? "Cobrado" : state === "current" ? "En curso" : "Pendiente"
      };
    }

    return buildEmptyWeek(weekNumber, startDate, selected.id);
  });
}

function buildEmptyWeek(weekNumber: number, startDate: Date, investmentId = "empty") {
  const startAt = addDays(startDate, (weekNumber - 1) * 7);
  const paymentAt = addDays(startDate, weekNumber * 7);

  return {
    baseAmount: 0,
    canCollect: false,
    investmentId,
    paymentAt: paymentAt.toISOString(),
    paymentLabel: formatDateLabel(paymentAt),
    startAt: startAt.toISOString(),
    startLabel: formatDateLabel(startAt),
    state: "pending" as const,
    statusLabel: "Pendiente",
    totalGenerated: 0,
    weeklyBonus: 0,
    weeklyQualifiedReferrals: 0,
    weeklyYield: 0,
    weekNumber
  };
}

function normalizeInvestment(investment: Investment) {
  return {
    ...investment,
    weeks: investment.weeks?.map((week) => ({
      ...week,
      paymentLabel: week.paymentLabel ?? formatDateLabel(week.paymentAt),
      startLabel: week.startLabel ?? formatDateLabel(week.startAt)
    }))
  };
}

function getHistoryTypeLabel(week: HistoryWeek) {
  if (week.state === "collected") return "Pago recibido";
  if (week.weeklyYield > 0 || week.weeklyBonus > 0) return "Rendimiento";
  return "Proximo pago";
}

function getDateFromIso(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDateLabel(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).replace(".", "");
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-MX", {
    currency: "MXN",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency"
  }).format(amount);
}

function formatCompactCurrency(amount: number) {
  if (amount >= 1000) return `$${Math.round(amount / 1000)}k`;
  return `$${Math.round(amount)}`;
}

function roundMoney(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function getSmoothPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return "";
  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const controlX = (previous.x + point.x) / 2;
    return `${path} C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, "");
}

function HistoryStateIcon({ state }: { state: HistoryWeek["state"] }) {
  if (state === "current") return <TrendIcon />;
  if (state === "pending") return <CalendarIcon />;
  return <DownloadIcon />;
}

function HistoryTypeIcon({ state }: { state: HistoryWeek["state"] }) {
  if (state === "current") return <TrendIcon />;
  if (state === "pending") return <CalendarIcon />;
  return <DownloadIcon />;
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m13.2 5.4 5.6 5.6H4v2h14.8l-5.6 5.6 1.4 1.4L22.6 12l-8-8z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 2h2v3h6V2h2v3h3v16H4V5h3Zm11 8H6v9h12ZM6 8h12V7H6Z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11 3h2v9.2l3.3-3.3 1.4 1.4L12 16l-5.7-5.7 1.4-1.4 3.3 3.3ZM5 18h14v2H5Z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5c5 0 8.6 4.3 9.7 6.3l.4.7-.4.7C20.6 14.7 17 19 12 19s-8.6-4.3-9.7-6.3L1.9 12l.4-.7C3.4 9.3 7 5 12 5Zm0 2C8.4 7 5.6 9.8 4.4 12 5.6 14.2 8.4 17 12 17s6.4-2.8 7.6-5C18.4 9.8 15.6 7 12 7Zm0 1.8a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4Zm0 2a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Z" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 19h16v2H3V4h2Zm2-3.4 3.6-4.2 3.2 2.3 4.3-6.6 1.7 1.1-5.5 8.5-3.4-2.5-3.4 4Z" />
    </svg>
  );
}
