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
    amount: "Base",
    detail: "Entrada registrada dentro del ciclo operativo."
  },
  {
    title: "Retorno modelado",
    amount: "Crecimiento",
    detail: "Calculo base del modelo antes de bonos."
  },
  {
    title: "Con referido",
    amount: "Bono",
    detail: "Bono ejemplo por una aportacion referida validada."
  },
  {
    title: "Capital gestionado",
    amount: "Reinversion",
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
      <header className="siteHeader">
        <a className="siteBrand" href="#">
          <img src="/logos/xspin-logo.svg" alt="Xspin" />
          <span>Financial</span>
        </a>
        <nav className="siteNav" aria-label="Navegacion principal">
          <a href="#modelo">Modelo</a>
          <a href="#rendimiento">Rendimiento</a>
          <a href="#control">Control</a>
        </nav>
        <a className="headerAccess" href="mailto:administracion@xspin.mx">Acceso</a>
      </header>
      <section className="hero">
        <div className="marketGlow" aria-hidden="true" />
        <div className="heroGrid">
          <div className="heroCopy">
            <div className="brandLockup">
              <img src="/logos/xspin-logo.svg" alt="Xspin" />
              <span>Financial</span>
            </div>
            <span className="eyebrow">Xspin Financial</span>
            <h1>Haz que tu capital trabaje en ciclos cortos y medibles.</h1>
            <p>
              Un modelo de crecimiento financiero con aportaciones organizadas,
              referidos trazables y reinversiones calculadas para que cada movimiento
              tenga seguimiento operativo.
            </p>
            <p className="riskNote">
              Los ejemplos son ilustrativos. El rendimiento depende de la operacion,
              reglas vigentes y validacion administrativa de cada ciclo.
            </p>
          </div>

          <div className="yieldTerminal" aria-label="Ejemplo visual de rendimiento">
            <div className="terminalTop">
              <span className="terminalBrand">
                <img src="/logos/xspin-mark.svg" alt="" aria-hidden="true" />
                XSPIN INDEX
              </span>
              <strong>Modelo activo</strong>
            </div>
            <div className="marketChart" aria-label="Grafica ascendente de capital proyectado">
              <div className="chartLegend">
                <span>Capital inicial</span>
                <strong>Ganancia proyectada</strong>
              </div>
              <svg viewBox="0 0 620 340" role="img" aria-labelledby="chartTitle">
                <title id="chartTitle">Grafica dinamica tipo trading con tendencia ascendente</title>
                <defs>
                  <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <g className="chartGrid">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <path key={`h-${index}`} d={`M24 ${36 + index * 36}H596`} />
                  ))}
                  {Array.from({ length: 12 }).map((_, index) => (
                    <path key={`v-${index}`} d={`M${48 + index * 48} 24V312`} />
                  ))}
                </g>
                <g className="volumeBars" aria-hidden="true">
                  {[46, 62, 54, 70, 88, 58, 74, 92, 80, 110, 96, 122, 144, 116, 156, 178, 164, 198].map((height, index) => (
                    <rect
                      key={`vol-${index}`}
                      x={34 + index * 31}
                      y={310 - height}
                      width="18"
                      height={height}
                      rx="2"
                    />
                  ))}
                </g>
                <g className="movingAverages" aria-hidden="true">
                  <path d="M26 228 C82 196 118 190 154 174 C198 154 226 170 262 156 C314 136 348 116 388 126 C444 138 496 74 590 42" />
                  <path d="M26 254 C88 224 138 216 188 196 C230 180 260 192 306 168 C352 144 390 146 430 132 C484 114 526 82 590 62" />
                  <path d="M26 270 C92 246 152 238 212 218 C270 198 306 202 356 182 C410 160 456 148 502 126 C540 108 562 86 590 74" />
                </g>
                <g className="candles" aria-hidden="true">
                  {[
                    [40, 210, 258, 232, 246, "up"],
                    [72, 194, 248, 210, 236, "down"],
                    [104, 178, 238, 188, 226, "up"],
                    [136, 160, 226, 204, 174, "down"],
                    [168, 134, 212, 150, 194, "up"],
                    [200, 154, 238, 216, 168, "down"],
                    [232, 184, 246, 198, 232, "up"],
                    [264, 160, 224, 174, 208, "up"],
                    [296, 132, 202, 190, 146, "down"],
                    [328, 116, 184, 132, 170, "up"],
                    [360, 96, 166, 150, 110, "up"],
                    [392, 82, 150, 96, 136, "up"],
                    [424, 104, 176, 158, 118, "down"],
                    [456, 74, 136, 86, 124, "up"],
                    [488, 48, 118, 66, 102, "up"],
                    [520, 36, 106, 92, 52, "down"],
                    [552, 28, 92, 42, 76, "up"],
                    [584, 14, 82, 28, 62, "up"]
                  ].map(([x, high, low, open, close, direction], index) => (
                    <g className={`candle ${String(direction)}`} key={`candle-${index}`}>
                      <line x1={x} x2={x} y1={high} y2={low} />
                      <rect
                        x={Number(x) - 7}
                        y={Math.min(Number(open), Number(close))}
                        width="14"
                        height={Math.max(10, Math.abs(Number(close) - Number(open)))}
                        rx="2"
                      />
                    </g>
                  ))}
                </g>
                <g className="chartLabels">
                  <text x="34" y="330">Inicio</text>
                  <text x="276" y="330">Ciclo</text>
                  <text x="520" y="330">Cierre</text>
                  <text x="472" y="28">Tendencia</text>
                </g>
              </svg>
            </div>
            <div className="terminalValue">
              <span>Capital proyectado</span>
              <strong>Crecimiento compuesto</strong>
              <small>retorno modelado + bono ejemplo + reinversion</small>
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

      <section className="controlSection" id="control">
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
