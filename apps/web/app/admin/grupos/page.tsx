import { getAdminDashboardData } from "../../../lib/admin-data";

export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const date = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" });

export default async function AdminGroupsPage() {
  const data = await getAdminDashboardData();
  const investments = data.users.flatMap((user) => user.investments.map((investment) => ({ user, investment })));

  return (
    <section className="adminPanel adminRoutePage">
      <div className="adminPanelHeader">
        <div>
          <span className="adminEyebrow">Grupos</span>
          <h1>Grupos de inversion</h1>
        </div>
      </div>
      <div className="adminTableWrap">
        <table className="adminTable">
          <thead>
            <tr>
              <th>Grupo</th>
              <th>Usuario</th>
              <th>Semana actual</th>
              <th>Monto inicial</th>
              <th>Reinversiones</th>
              <th>Cobros</th>
              <th>Fecha cobro</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {investments.map(({ user, investment }) => (
              <tr key={investment.id}>
                <td>{investment.group}</td>
                <td>{user.fullName}</td>
                <td>{investment.week}</td>
                <td>{money.format(investment.principal)}</td>
                <td>{money.format(investment.expected - investment.principal)}</td>
                <td>{money.format(investment.expected)}</td>
                <td>{date.format(investment.dueAt)}</td>
                <td><span className={`adminPill ${investment.status.toLowerCase()}`}>{investment.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
