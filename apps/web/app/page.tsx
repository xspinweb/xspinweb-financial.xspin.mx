const metrics = [
  { label: "Inversionistas activos", value: "0" },
  { label: "Captacion actual", value: "$0.00" },
  { label: "Aprovisionamiento", value: "$0.00" },
  { label: "Ingreso neto", value: "$0.00" }
];

const rows = [
  {
    code: "Pendiente",
    group: "-",
    cycle: "-",
    due: "-",
    referrals: "-",
    status: "Sin datos"
  }
];

export default function HomePage() {
  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brandMark">PF</span>
          <div>
            <strong>Pay Financial</strong>
            <small>Operacion</small>
          </div>
        </div>

        <nav className="nav">
          <a className="active" href="#">Dashboard</a>
          <a href="#">Inversionistas</a>
          <a href="#">Pagos</a>
          <a href="#">Grupos</a>
          <a href="#">Reportes</a>
          <a href="#">Configuracion</a>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>Dashboard</h1>
            <p>Resumen operativo de inversionistas, ciclos y pagos.</p>
          </div>
          <button type="button">Nuevo inversionista</button>
        </header>

        <section className="metrics" aria-label="Metricas principales">
          {metrics.map((metric) => (
            <article className="metric" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </article>
          ))}
        </section>

        <section className="panel">
          <div className="panelHeader">
            <h2>Inversiones por atender</h2>
            <span>Primer corte</span>
          </div>

          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Inversor</th>
                  <th>Grupo</th>
                  <th>Ciclo</th>
                  <th>Fecha pago</th>
                  <th>Referidos</th>
                  <th>Estatus</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.code}>
                    <td>{row.code}</td>
                    <td>{row.group}</td>
                    <td>{row.cycle}</td>
                    <td>{row.due}</td>
                    <td>{row.referrals}</td>
                    <td>
                      <span className="status">{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
