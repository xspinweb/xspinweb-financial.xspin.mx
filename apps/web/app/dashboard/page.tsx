import { getServerSession } from "next-auth";
import { getAppRole } from "../../lib/access";
import { authOptions } from "../../lib/auth";

const adminCards = [
  { label: "Usuarios activos", value: "0" },
  { label: "Ciclos abiertos", value: "0" },
  { label: "Pagos por revisar", value: "0" },
  { label: "Reportes pendientes", value: "0" }
];

const userCards = [
  { label: "Capital activo", value: "0" },
  { label: "Ganancias acumuladas", value: "0" },
  { label: "Referidos activos", value: "0" },
  { label: "Bonos disponibles", value: "0" }
];

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const role = getAppRole(session?.user?.email);
  const isSuperAdmin = role === "SUPER_ADMIN";
  const cards = isSuperAdmin ? adminCards : userCards;

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
        <button type="button">{isSuperAdmin ? "Nuevo usuario" : "Invitar"}</button>
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
          <h2>{isSuperAdmin ? "Actividad por atender" : "Mis movimientos recientes"}</h2>
          <span>{isSuperAdmin ? "Operacion" : "Cuenta"}</span>
        </div>
        <table className="dashboardTable">
          <thead>
            <tr>
              <th>{isSuperAdmin ? "Usuario" : "Movimiento"}</th>
              <th>{isSuperAdmin ? "Grupo" : "Tipo"}</th>
              <th>Ciclo</th>
              <th>Fecha</th>
              <th>{isSuperAdmin ? "Referidos" : "Detalle"}</th>
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
