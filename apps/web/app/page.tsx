const modelSteps = [
  {
    label: "01",
    title: "Capital organizado por ciclos",
    text: "Cada aportacion entra a un ciclo operativo con fecha de registro, fecha objetivo de pago y seguimiento interno."
  },
  {
    label: "02",
    title: "Grupos controlados",
    text: "Los participantes se ordenan en grupos para administrar captacion, compromisos y flujo de salida con mayor claridad."
  },
  {
    label: "03",
    title: "Referidos con trazabilidad",
    text: "Cuando un participante recomienda a otro, el sistema liga ambos perfiles y calcula el bono correspondiente."
  },
  {
    label: "04",
    title: "Reinversion y liquidez",
    text: "Al cierre del ciclo se distingue rendimiento, capital disponible, reinversion y pago registrado."
  }
];

const metrics = [
  { value: "7 dias", label: "ciclo operativo configurable" },
  { value: "5%", label: "bono base por referido" },
  { value: "6", label: "participantes por grupo" },
  { value: "1.44x", label: "retorno base modelado" }
];

const controls = [
  "Registro de inversionistas y referidos",
  "Fechas de pago y estatus por ciclo",
  "Captacion, provisionamiento e ingreso neto",
  "Historial de reinversiones y pagos"
];

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <div className="heroGrid">
          <div className="heroCopy">
            <span className="eyebrow">Pay Financial</span>
            <h1>Administracion clara para ciclos de inversion y referidos.</h1>
            <p>
              Una plataforma operativa para registrar aportaciones, organizar grupos,
              controlar fechas de pago, calcular bonos y dar seguimiento a reinversiones
              con trazabilidad de principio a fin.
            </p>
            <div className="heroActions">
              <a className="primaryAction" href="#modelo">Conocer modelo</a>
              <a className="secondaryAction" href="#control">Ver control operativo</a>
            </div>
          </div>

          <div className="heroVisual" aria-label="Resumen visual del modelo Pay Financial">
            <div className="flowPanel">
              <div className="flowHeader">
                <span>Modelo operativo</span>
                <strong>Activo</strong>
              </div>
              <div className="flowLine">
                <span>Inversion</span>
                <strong>$10,000.00</strong>
              </div>
              <div className="flowLine">
                <span>Retorno modelado</span>
                <strong>$14,400.00</strong>
              </div>
              <div className="flowLine">
                <span>Bono referido</span>
                <strong>$500.00</strong>
              </div>
              <div className="flowSplit">
                <div>
                  <span>Rendimiento</span>
                  <strong>$2,235.00</strong>
                </div>
                <div>
                  <span>Reinversion</span>
                  <strong>$12,665.00</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="metricsBand" aria-label="Parametros del modelo">
        {metrics.map((metric) => (
          <div className="metricItem" key={metric.label}>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </div>
        ))}
      </section>

      <section className="section" id="modelo">
        <div className="sectionHeader">
          <span className="eyebrow">Modelo de negocio</span>
          <h2>Un flujo medible para captacion, pagos y crecimiento por recomendacion.</h2>
          <p>
            Pay Financial no se apoya en hojas sueltas ni calculos manuales: cada movimiento
            queda ligado a un participante, un ciclo, un grupo y un estatus.
          </p>
        </div>

        <div className="stepsGrid">
          {modelSteps.map((step) => (
            <article className="stepCard" key={step.label}>
              <span>{step.label}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="controlSection" id="control">
        <div className="controlCopy">
          <span className="eyebrow">Control operativo</span>
          <h2>Del registro al pago, todo queda en una sola linea de seguimiento.</h2>
          <p>
            La plataforma esta pensada para operadores que necesitan ver rapidamente
            que capital entro, quien recomendo a quien, que ciclo esta por cerrar y
            cuanto debe provisionarse para pagos.
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
          <span className="eyebrow">Siguiente etapa</span>
          <h2>Una operacion financiera requiere datos confiables, no memoria.</h2>
        </div>
        <a className="primaryAction" href="mailto:administracion@xspin.mx">Solicitar acceso</a>
      </section>
    </main>
  );
}
