const cards = [
  { label: "Inversionistas activos", value: "0" },
  { label: "Captacion actual", value: "0" },
  { label: "Ciclos pendientes", value: "0" },
  { label: "Pagos por revisar", value: "0" }
];

export default function DashboardPage() {
  return (
    <div className="dashboardContent">
      <section className="dashboardHero">
        <div>
          <span className="loginEyebrow">Dashboard</span>
          <h1>Resumen operativo</h1>
          <p>Vista inicial para controlar inversionistas, ciclos, pagos y reinversiones.</p>
        </div>
        <button type="button">Nuevo inversionista</button>
      </section>

      <section className="dashboardCards">
        {cards.map((card) => (
          <article className="dashboardCard" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </section>

      <section className="dashboardTablePanel">
        <div className="tableHeader">
          <h2>Inversiones por atender</h2>
          <span>Primer corte</span>
        </div>
        <table className="dashboardTable">
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
            <tr>
              <td>Pendiente</td>
              <td>-</td>
              <td>-</td>
              <td>-</td>
              <td>-</td>
              <td><span className="pill">Sin datos</span></td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
