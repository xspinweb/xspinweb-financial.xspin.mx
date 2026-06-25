import { getAdminDashboardData } from "../../../lib/admin-data";

export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const date = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" });

export default async function AdminWithdrawalsPage() {
  const data = await getAdminDashboardData();

  return (
    <section className="adminPanel adminRoutePage">
      <div className="adminPanelHeader">
        <div>
          <span className="adminEyebrow">Retiros</span>
          <h1>Solicitudes de retiro</h1>
        </div>
      </div>
      <div className="adminTableWrap">
        <table className="adminTable">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Correo</th>
              <th>Metodo</th>
              <th>Monto</th>
              <th>Fecha solicitud</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {data.withdrawals.length ? data.withdrawals.map((withdrawal) => (
              <tr key={withdrawal.id}>
                <td>{withdrawal.userName}</td>
                <td>{withdrawal.email}</td>
                <td>{withdrawal.method.label}</td>
                <td>{money.format(withdrawal.amount)}</td>
                <td>{date.format(withdrawal.requestedAt)}</td>
                <td><span className="adminPill pendiente">{withdrawal.status}</span></td>
              </tr>
            )) : (
              <tr><td colSpan={6}>Sin retiros pendientes.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
