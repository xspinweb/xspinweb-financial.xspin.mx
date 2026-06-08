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
  { label: "Inversiones activas", value: "1" },
  { label: "Referidos confirmados", value: "2" },
  { label: "Proximo pago", value: "7 dias" },
  { label: "Estatus actual", value: "Por cobrar" }
];

const investorRows = [
  {
    id: "INV-001",
    name: "Roecx",
    group: "Grupo 1",
    cycle: "Semana 1 de 12",
    investedAt: "08 Jun 2026",
    nextPaymentAt: "15 Jun 2026",
    referrals: [
      { name: "Referido 1", invested: true, investedAt: "08 Jun 2026" },
      { name: "Referido 2", invested: true, investedAt: "08 Jun 2026" }
    ]
  },
  {
    id: "INV-002",
    name: "Roecx",
    group: "Grupo 2",
    cycle: "Semana 1 de 12",
    investedAt: "08 Jun 2026",
    nextPaymentAt: "15 Jun 2026",
    referrals: [{ name: "Referido pendiente", invested: false, investedAt: "-" }]
  }
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
        <div className="quickActions" aria-label="Acciones rapidas">
          {isSuperAdmin ? (
            <button type="button" aria-label="Nuevo usuario" title="Nuevo usuario">
              <UserPlusIcon />
              <span>Usuario</span>
            </button>
          ) : (
            <>
              <button type="button" aria-label="Invertir" title="Invertir">
                <InvestIcon />
                <span>Invertir</span>
              </button>
              <button type="button" aria-label="Invitar" title="Invitar">
                <InviteIcon />
                <span>Invitar</span>
              </button>
            </>
          )}
        </div>
      </section>

      <section className="dashboardCards">
        {cards.map((card) => (
          <article className="dashboardCard" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </section>

      {isSuperAdmin ? <AdminActivityPanel /> : <InvestorHomePanel />}
    </div>
  );
}

function InvestIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 18.5h16v2H3a1 1 0 0 1-1-1V4h2Zm2-2.4 4.1-4.8 3.1 2.7 5-7.2 1.6 1.1-6.3 9.1-3.2-2.8-2.8 3.3Zm12.4-3.9H22v3.6h-2v-1.6h-1.6Z" />
    </svg>
  );
}

function InviteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.5 11.4a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4Zm0 2.3c-4.1 0-7.3 2.1-7.3 4.8V20h10.2a6.3 6.3 0 0 1-.4-2.2c0-1.4.5-2.8 1.3-3.8-1.1-.2-2.4-.3-3.8-.3Zm8.4-1a5.1 5.1 0 1 0 0 10.2 5.1 5.1 0 0 0 0-10.2Zm.8 2.5v2h2v1.6h-2v2h-1.6v-2h-2v-1.6h2v-2Z" />
    </svg>
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

function InvestorHomePanel() {
  return (
    <section className="investmentPanel">
      <div className="tableHeader">
        <h2>Mis inversiones</h2>
        <span>Inicio</span>
      </div>
      <div className="investmentList">
        {investorRows.map((investment) => {
          const confirmedReferrals = investment.referrals.filter((referral) => referral.invested).length;
          const canCollect = confirmedReferrals >= 2;

          return (
            <details className="investmentItem" key={investment.id}>
              <summary>
                <div className="investmentSummaryMain">
                  <span>{investment.name}</span>
                  <strong>{investment.group}</strong>
                </div>
                <div>
                  <span>Ciclo</span>
                  <strong>{investment.cycle}</strong>
                </div>
                <div>
                  <span>Fecha</span>
                  <strong>{investment.investedAt}</strong>
                </div>
                <div>
                  <span>Referidos</span>
                  <strong>{confirmedReferrals}</strong>
                </div>
                <div>
                  <span>Proximo pago</span>
                  <strong>{investment.nextPaymentAt}</strong>
                </div>
                <span className={canCollect ? "statusPill statusGreen" : "statusPill statusRed"}>
                  {canCollect ? "Por cobrar" : "Pendiente"}
                </span>
              </summary>

              <div className="referralPanel">
                <div className="referralHeader">
                  <strong>Referidos</strong>
                  <span>Se requieren al menos 2 referidos con inversion confirmada.</span>
                </div>
                <div className="referralList">
                  {investment.referrals.map((referral) => (
                    <div className="referralItem" key={`${investment.id}-${referral.name}`}>
                      <div>
                        <strong>{referral.name}</strong>
                        <span>{referral.investedAt}</span>
                      </div>
                      <span className={referral.invested ? "statusPill statusGreen" : "statusPill statusRed"}>
                        {referral.invested ? "Confirmado" : "Pendiente"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
