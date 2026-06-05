const growthStats = [
  { value: "1.44x", label: "retorno modelado por ciclo" },
  { value: "7 dias", label: "horizonte operativo base" },
  { value: "5%", label: "bono por referido directo" },
  { value: "15%", label: "rendimiento sobre capital del ciclo" }
];

const path = [
  "Aportacion inicial",
  "Asignacion a grupo",
  "Seguimiento del ciclo",
  "Pago o reinversion"
];

const scenarios = [
  {
    title: "Capital inicial",
    amount: "$10,000",
    detail: "Entrada registrada dentro del ciclo operativo."
  },
  {
    title: "Retorno modelado",
    amount: "$14,400",
    detail: "Calculo base del modelo antes de bonos."
  },
  {
    title: "Con referido",
    amount: "+$500",
    detail: "Bono ejemplo por una aportacion referida de $10,000."
  },
  {
    title: "Capital gestionado",
    amount: "$14,900",
    detail: "Base para rendimiento, pago y posible reinversion."
  }
];

const controls = [
  "Cada inversionista tiene codigo, grupo, ciclo y fecha objetivo.",
  "Los referidos quedan conectados al participante que los invita.",
  "Los pagos se separan entre rendimiento, reinversion y capital gestionado.",
  "La operacion puede auditar captacion, provisionamiento, pagos e ingreso neto."
];

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <div className="marketGlow" aria-hidden="true" />
        <div className="heroGrid">
          <div className="heroCopy">
            <span className="eyebrow">Pay Financial</span>
            <h1>Haz que tu capital trabaje en ciclos cortos y medibles.</h1>
            <p>
              Un modelo de crecimiento financiero con aportaciones organizadas,
              referidos trazables y reinversiones calculadas para que cada movimiento
              tenga seguimiento operativo.
            </p>
            <div className="heroActions">
              <a className="primaryAction" href="#rendimiento">Ver ejemplo</a>
              <a className="secondaryAction" href="#modelo">Como funciona</a>
            </div>
            <p className="riskNote">
              Los ejemplos son ilustrativos. El rendimiento depende de la operacion,
              reglas vigentes y validacion administrativa de cada ciclo.
            </p>
          </div>

          <div className="yieldTerminal" aria-label="Ejemplo visual de rendimiento">
            <div className="terminalTop">
              <span>PAY / MXN</span>
              <strong>Modelo activo</strong>
            </div>
            <div className="marketChart" aria-label="Grafica ascendente de capital proyectado">
              <div className="chartLegend">
                <span>Capital inicial</span>
                <strong>Ganancia proyectada</strong>
              </div>
              <svg viewBox="0 0 520 280" role="img" aria-labelledby="chartTitle">
                <title id="chartTitle">Grafica de crecimiento proyectado de una inversion</title>
                <defs>
                  <linearGradient id="profitFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#35e0a1" stopOpacity="0.36" />
                    <stop offset="100%" stopColor="#35e0a1" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="profitStroke" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#17c6d3" />
                    <stop offset="100%" stopColor="#35e0a1" />
                  </linearGradient>
                  <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <g className="chartGrid">
                  <path d="M40 40H500" />
                  <path d="M40 92H500" />
                  <path d="M40 144H500" />
                  <path d="M40 196H500" />
                  <path d="M40 248H500" />
                  <path d="M80 28V248" />
                  <path d="M170 28V248" />
                  <path d="M260 28V248" />
                  <path d="M350 28V248" />
                  <path d="M440 28V248" />
                </g>
                <path
                  className="chartArea"
                  fill="url(#profitFill)"
                  d="M40 220 C95 210 120 188 170 178 C218 168 224 134 270 126 C330 115 340 82 394 76 C444 70 462 48 500 36 L500 248 L40 248 Z"
                />
                <path
                  className="chartLine"
                  stroke="url(#profitStroke)"
                  d="M40 220 C95 210 120 188 170 178 C218 168 224 134 270 126 C330 115 340 82 394 76 C444 70 462 48 500 36"
                />
                <g className="chartPoints">
                  <circle cx="40" cy="220" r="6" />
                  <circle cx="170" cy="178" r="6" />
                  <circle cx="270" cy="126" r="6" />
                  <circle cx="394" cy="76" r="6" />
                  <circle cx="500" cy="36" r="7" />
                </g>
                <g className="chartLabels">
                  <text x="40" y="270">Inicio</text>
                  <text x="238" y="270">Ciclo</text>
                  <text x="452" y="270">Cierre</text>
                  <text x="420" y="28">+$4,900</text>
                </g>
              </svg>
            </div>
            <div className="terminalValue">
              <span>Capital proyectado</span>
              <strong>$14,900.00</strong>
              <small>incluye retorno modelado + bono ejemplo</small>
            </div>
            <div className="terminalGrid">
              <div>
                <span>Ciclo</span>
                <strong>7D</strong>
              </div>
              <div>
                <span>Grupo</span>
                <strong>6</strong>
              </div>
              <div>
                <span>Bono</span>
                <strong>5%</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="statsStrip" aria-label="Metricas del modelo">
        {growthStats.map((stat) => (
          <div className="stat" key={stat.label}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </section>

      <section className="section split" id="modelo">
        <div>
          <span className="eyebrow">Modelo de crecimiento</span>
          <h2>Un flujo simple para entrar, crecer y reinvertir con control.</h2>
          <p>
            La diferencia esta en operar el capital como un sistema: cada ciclo tiene
            reglas, fechas, grupos y estatus. Cada referido suma al modelo y cada cierre
            se convierte en informacion accionable.
          </p>
        </div>

        <div className="pathPanel">
          {path.map((item, index) => (
            <div className="pathItem" key={item}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{item}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="yieldSection" id="rendimiento">
        <div className="sectionHeader">
          <span className="eyebrow">Ejemplo de rendimiento</span>
          <h2>Visualiza como puede evolucionar una aportacion dentro del ciclo.</h2>
          <p>
            Este ejemplo usa los parametros base del sistema. Sirve para explicar la
            mecanica del modelo, no como garantia de resultado.
          </p>
        </div>

        <div className="scenarioGrid">
          {scenarios.map((scenario) => (
            <article className="scenarioCard" key={scenario.title}>
              <span>{scenario.title}</span>
              <strong>{scenario.amount}</strong>
              <p>{scenario.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="controlSection">
        <div className="controlCopy">
          <span className="eyebrow">Operacion transparente</span>
          <h2>El atractivo esta en crecer; la confianza esta en medirlo todo.</h2>
          <p>
            Pay Financial combina una narrativa de oportunidad con administracion real:
            registros, calculos, pagos, reinversiones y reportes para operar con orden.
          </p>
        </div>

        <div className="controlList">
          {controls.map((control) => (
            <div className="controlItem" key={control}>
              <span aria-hidden="true" />
              <p>{control}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="closingBand">
        <div>
          <span className="eyebrow">Acceso privado</span>
          <h2>Construye crecimiento con ciclos, referidos y reinversion inteligente.</h2>
        </div>
        <a className="primaryAction" href="mailto:administracion@xspin.mx">Solicitar acceso</a>
      </section>
    </main>
  );
}
