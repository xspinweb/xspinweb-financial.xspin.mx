const initialAmount = 50;
const referralCount = 2;
const reinvestPercent = 82;
const cycleDays = 7;
const referralBonusRate = 0.035;
const referralYieldRate = 0.265;

type DemoWeek = {
  baseAmount: number;
  bonusAmount: number;
  paymentLabel: string;
  rawYield: number;
  reinvestedAmount: number;
  startLabel: string;
  totalGenerated: number;
  weeklyReferralAmount: number;
  withdrawalAmount: number;
  yieldAmount: number;
  yieldWasCapped: boolean;
  weekNumber: number;
};

export default function DemoPage() {
  const weeks = buildDemoWeeks();
  const lastWeek = weeks[weeks.length - 1];

  return (
    <main className="demoPage">
      <section className="demoShell">
        <header className="demoHeader">
          <div>
            <span className="loginEyebrow">Tablero de muestra</span>
            <h1>Flujo semanal con inversion de {formatCurrency(initialAmount)}</h1>
            <p>
              Escenario simulado con un inversionista base y dos referidos confirmados. Cada persona inicia con {formatCurrency(initialAmount)} y
              reinvierte el {reinvestPercent}% al cierre de cada semana.
            </p>
          </div>
          <div className="demoTotalCard">
            <span>Total semana 12</span>
            <strong>{formatCurrency(lastWeek.totalGenerated)}</strong>
          </div>
        </header>

        <section className="dashboardCards demoCards">
          <article className="dashboardCard">
            <span>Inversion base</span>
            <strong>{formatCurrency(initialAmount)}</strong>
          </article>
          <article className="dashboardCard">
            <span>Referidos activos</span>
            <strong>{referralCount}</strong>
          </article>
          <article className="dashboardCard">
            <span>Bono por referido</span>
            <strong>{formatPercent(referralBonusRate)}</strong>
          </article>
          <article className="dashboardCard">
            <span>Rendimiento referido</span>
            <strong>{formatPercent(referralYieldRate)}</strong>
          </article>
        </section>

        <section className="investmentPanel demoPanel">
          <div className="tableHeader">
            <h2>Simulacion de semanas</h2>
            <span>{cycleDays} dias por ciclo</span>
          </div>

          <div className="weekList demoWeekList">
            {weeks.map((week) => (
              <details className="weekItem" key={week.weekNumber} open={week.weekNumber === 1}>
                <summary>
                  <div>
                    <span>Semana</span>
                    <strong>{week.weekNumber} de 12</strong>
                  </div>
                  <div>
                    <span>Inicio</span>
                    <strong>{week.startLabel}</strong>
                  </div>
                  <div>
                    <span>Pago</span>
                    <strong>{week.paymentLabel}</strong>
                  </div>
                  <span className="statusPill statusGreen">Cobrable</span>
                </summary>

                <div className="weekDetailGrid demoWeekGrid">
                  <div>
                    <span>Monto base</span>
                    <strong>{formatCurrency(week.baseAmount)}</strong>
                  </div>
                  <div>
                    <span>Referidos confirmados</span>
                    <strong>{referralCount}</strong>
                  </div>
                  <div>
                    <span>Movimiento referidos</span>
                    <strong>{formatCurrency(week.weeklyReferralAmount)}</strong>
                  </div>
                  <div>
                    <span>Bono semanal</span>
                    <strong>{formatCurrency(week.bonusAmount)}</strong>
                  </div>
                  <div>
                    <span>Rendimiento calculado</span>
                    <strong>{formatCurrency(week.yieldAmount)}</strong>
                  </div>
                  <div>
                    <span>Total generado</span>
                    <strong>{formatCurrency(week.totalGenerated)}</strong>
                  </div>
                  <div>
                    <span>Reinversion {reinvestPercent}%</span>
                    <strong>{formatCurrency(week.reinvestedAmount)}</strong>
                  </div>
                  <div>
                    <span>Retiro disponible</span>
                    <strong>{formatCurrency(week.withdrawalAmount)}</strong>
                  </div>
                </div>

                {week.yieldWasCapped ? (
                  <p className="demoNote">
                    El rendimiento bruto era {formatCurrency(week.rawYield)} y se limito al 75% del monto base.
                  </p>
                ) : null}
              </details>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function buildDemoWeeks() {
  const startDate = new Date("2026-06-08T12:00:00-06:00");
  const weeks: DemoWeek[] = [];
  let baseAmount = initialAmount;
  let referralWeeklyAmount = initialAmount;

  for (let index = 0; index < 12; index += 1) {
    const weekNumber = index + 1;
    const weeklyReferralAmount = roundMoney(referralWeeklyAmount * referralCount);
    const bonusAmount = roundMoney(weeklyReferralAmount * referralBonusRate);
    const rawYield = roundMoney(weeklyReferralAmount * referralYieldRate);
    const yieldWasCapped = rawYield > baseAmount;
    const yieldAmount = yieldWasCapped ? roundMoney(baseAmount * 0.75) : rawYield;
    const totalGenerated = roundMoney(baseAmount + bonusAmount + yieldAmount);
    const reinvestedAmount = roundMoney(totalGenerated * (reinvestPercent / 100));
    const withdrawalAmount = roundMoney(totalGenerated - reinvestedAmount);
    const weekStart = addDays(startDate, index * cycleDays);
    const paymentDate = addDays(startDate, weekNumber * cycleDays);

    weeks.push({
      baseAmount,
      bonusAmount,
      paymentLabel: formatDate(paymentDate),
      rawYield,
      reinvestedAmount,
      startLabel: formatDate(weekStart),
      totalGenerated,
      weeklyReferralAmount,
      withdrawalAmount,
      yieldAmount,
      yieldWasCapped,
      weekNumber
    });

    baseAmount = reinvestedAmount;
    referralWeeklyAmount = reinvestedAmount;
  }

  return weeks;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function roundMoney(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
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

function formatPercent(rate: number) {
  return new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: 1,
    style: "percent"
  }).format(rate);
}
