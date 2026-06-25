import Link from "next/link";
import { getAdminDashboardData } from "../../../lib/admin-data";

export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const date = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" });

export default async function AdminUsersPage() {
  const data = await getAdminDashboardData();

  return (
    <section className="adminPanel adminRoutePage">
      <div className="adminPanelHeader">
        <div>
          <span className="adminEyebrow">Usuarios</span>
          <h1>Usuarios registrados</h1>
        </div>
        <Link href="/admin/dashboard">Volver al dashboard</Link>
      </div>
      <div className="adminTableWrap">
        <table className="adminTable">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nivel</th>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Telefono</th>
              <th>Pais</th>
              <th>Ciudad</th>
              <th>Registro</th>
              <th>Conexion</th>
              <th>KYC</th>
              <th>Grupos</th>
              <th>Invertido</th>
              <th>Cobrado</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((user) => (
              <tr key={user.id}>
                <td>{user.labelId}</td>
                <td><span className={`adminPill ${user.level.toLowerCase()}`}>{user.level}</span></td>
                <td><Link href={`/admin/dashboard?user=${user.id}`}>{user.fullName}</Link></td>
                <td>{user.email}</td>
                <td>{user.phone}</td>
                <td>{user.country}</td>
                <td>{user.city}</td>
                <td>{date.format(user.registeredAt)}</td>
                <td><span className={`adminStatus ${user.connection.toLowerCase()}`}><i />{user.connection}</span></td>
                <td><span className={`adminPill ${user.kyc.toLowerCase()}`}>{user.kyc}</span></td>
                <td>{user.activeGroups}</td>
                <td>{money.format(user.totalInvested)}</td>
                <td>{money.format(user.totalPaid)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
