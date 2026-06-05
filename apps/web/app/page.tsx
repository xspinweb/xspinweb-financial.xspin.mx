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
            <div className="chartBars" aria-hidden="true">
              <span style={{ height: "34%" }} />
              <span style={{ height: "48%" }} />
              <span style={{ height: "57%" }} />
              <span style={{ height: "68%" }} />
              <span style={{ height: "82%" }} />
              <span style={{ height: "96%" }} />
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
