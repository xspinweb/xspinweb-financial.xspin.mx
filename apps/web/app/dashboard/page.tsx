import { getServerSession } from "next-auth";
import { getAppRole } from "../../lib/access";
import { authOptions } from "../../lib/auth";
import { InvestorDashboard } from "./investor-dashboard";

const adminCards = [
  { label: "Usuarios activos", value: "0" },
  { label: "Ciclos abiertos", value: "0" },
  { label: "Pagos por revisar", value: "0" },
  { label: "Reportes pendientes", value: "0" }
];

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const role = getAppRole(session?.user?.email);
  const isSuperAdmin = role === "SUPER_ADMIN";
  const userName = session?.user?.name ?? "Usuario";
  const userEmail = session?.user?.email ?? "";

  return (
    <div className="dashboardContent">
      <section className="dashboardHero">
        <div>
          <span className="loginEyebrow">{isSuperAdmin ? "Super admin" : "Mi cuenta"}</span>
          <h1>{isSuperAdmin ? "Resumen global" : "Mi tablero financiero"}</h1>
          <p>
            {isSuperAdmin
              ? "Vista general para controlar usuarios, ciclos, pagos, referidos y reportes."
              : "Consulta tus inversiones, ganancias, pagos, referidos y bonos desde un solo lugar."}
          </p>
        </div>
        {isSuperAdmin ? (
          <div className="quickActions" aria-label="Acciones rapidas">
            <a href="#" aria-label="Nuevo usuario" title="Nuevo usuario">
              <UserPlusIcon />
              <span>Usuario</span>
            </a>
          </div>
        ) : null}
      </section>

      {isSuperAdmin ? (
        <>
          <section className="dashboardCards">
            {adminCards.map((card) => (
              <article className="dashboardCard" key={card.label}>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </article>
            ))}
          </section>
          <AdminActivityPanel />
        </>
      ) : (
        <InvestorDashboard userEmail={userEmail} userName={userName} />
      )}
    </div>
  );
}

function UserPlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.8 11.2a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2.4c-3.9 0-7 2-7 4.4v1.1c0 .7.5 1.2 1.2 1.2h8.4a6.5 6.5 0 0 1-.4-2.2c0-1.4.4-2.8 1.2-3.8-1-.4-2.1-.7-3.4-.7Zm7.9-1.2a5.2 5.2 0 1 0 0 10.4 5.2 5.2 0 0 0 0-10.4Zm.8 2.6v2.2h2.2v1.7h-2.2v2.2h-1.7v-2.2h-2.2v-1.7h2.2V15Z" />
    </svg>
  );
}

function AdminActivityPanel() {
  return (
    <section className="dashboardTablePanel">
      <div className="tableHeader">
        <h2>Actividad por atender</h2>
        <span>Operacion</span>
      </div>
      <table className="dashboardTable">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Grupo</th>
            <th>Ciclo</th>
            <th>Fecha</th>
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
            <td>
              <span className="pill">Sin datos</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
