import Link from "next/link";
import { confirmWithdrawal, declineWithdrawal, toggleInvestorStatus } from "../actions";
import { getAdminDashboardData } from "../../../lib/admin-data";

export const dynamic = "force-dynamic";

type AdminDashboardPageProps = {
  searchParams?: {
    user?: string;
  };
};

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN"
});

const dateTime = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short"
});

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
  const data = await getAdminDashboardData(searchParams?.user);
  const selected = searchParams?.user ? data.users.find((user) => user.id === searchParams.user) ?? null : null;

  return (
    <div className={selected ? "adminDashboard hasDetail" : "adminDashboard"}>
      <section className="adminMain">
        <header className="adminTopbar">
          <div>
            <span>Administrador</span>
            <h1>Panel general</h1>
          </div>
          <label className="adminSearch">
            <input placeholder="Buscar usuario..." />
            <span>Buscar</span>
          </label>
        </header>

        <section className="adminKpiGrid">
          <AdminKpi label="Total usuarios" value={data.stats.totalUsers.toLocaleString("es-MX")} trend="+12.5%" />
          <AdminKpi label="Usuarios activos" value={data.stats.activeUsers.toLocaleString("es-MX")} trend="+8.3%" />
          <AdminKpi label="Inversiones activas" value={data.stats.activeInvestments.toLocaleString("es-MX")} trend="+15.2%" />
          <AdminKpi label="Total invertido" value={money.format(data.stats.totalInvested)} trend="+18.6%" />
          <AdminKpi label="Total pagado" value={money.format(data.stats.totalPaid)} trend="+11.4%" />
          <AdminKpi label="Retiros pendientes" value={data.stats.pendingWithdrawals.toLocaleString("es-MX")} trend="-5.1%" tone="warning" />
          <AdminKpi label="KYC pendientes" value={data.stats.pendingKyc.toLocaleString("es-MX")} trend="-3.4%" tone="warning" />
          <AdminKpi label="Nuevos registros hoy" value={data.stats.newToday.toLocaleString("es-MX")} trend="+7.6%" />
        </section>

        <section className="adminPanel adminUsersPanel">
          <div className="adminPanelHeader">
            <h2>Usuarios recientes</h2>
            <div className="adminTableActions">
              <Link href="/admin/usuarios">Todos los usuarios</Link>
              <button type="button">Filtros</button>
              <button className="primary" type="button">Exportar</button>
            </div>
          </div>
          <div className="adminTableWrap">
            <table className="adminTable">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Usuario</th>
                  <th>Nivel</th>
                  <th>Pais</th>
                  <th>Inversion</th>
                  <th>Grupos</th>
                  <th>Estado</th>
                  <th>KYC</th>
                  <th>Ultimo acceso</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.users.length ? data.users.map((user) => (
                  <tr className={selected?.id === user.id ? "selected" : ""} key={user.id}>
                    <td>{user.labelId}</td>
                    <td>
                      <span className="adminUserCell">
                        <AdminAvatar name={user.fullName} src={user.profileImage} size="sm" />
                        {user.fullName}
                      </span>
                    </td>
                    <td>{user.userName}</td>
                    <td><AdminPill tone={user.level.toLowerCase()}>{user.level}</AdminPill></td>
                    <td>{user.country}</td>
                    <td>{money.format(user.totalInvested)}</td>
                    <td>{user.activeGroups}</td>
                    <td><AdminStatus status={user.connection} /></td>
                    <td><AdminPill tone={user.kyc.toLowerCase()}>{user.kyc}</AdminPill></td>
                    <td>{timeAgo(user.lastAccessAt)}</td>
                    <td><Link className="adminIconLink" href={`/admin/dashboard?user=${user.id}`}>Ver</Link></td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={11}>Aun no hay usuarios registrados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {selected ? (
        <aside className="adminDetailPanel">
          <Link className="adminDetailClose" href="/admin/dashboard" aria-label="Cerrar detalle">x</Link>
          <div className="adminDetailHeader">
            <AdminAvatar name={selected.fullName} src={selected.profileImage} size="lg" />
            <div>
              <h2>{selected.fullName}</h2>
              <span>{selected.email}</span>
              <small>{selected.phone}</small>
              <div className="adminDetailBadges">
                <AdminPill tone={selected.level.toLowerCase()}>{selected.level}</AdminPill>
                <AdminPill tone="id">ID: {selected.labelId}</AdminPill>
              </div>
            </div>
            <AdminStatus status={selected.connection} />
          </div>

          <div className="adminTabs">
            <span className="active">Resumen</span>
            <span>Inversiones</span>
            <span>Bonos</span>
            <span>Wallet</span>
            <span>Metodos de pago</span>
            <span>Documentos</span>
            <span>Actividad</span>
          </div>

          <AdminInfo title="Informacion general" rows={[
            ["Pais", selected.country],
            ["Ciudad", selected.city],
            ["Fecha nacimiento", selected.birthDate ? dateTime.format(selected.birthDate) : "-"],
            ["Fecha registro", dateTime.format(selected.registeredAt)],
            ["Estado conexion", selected.connection],
            ["Ultimo acceso", dateTime.format(selected.lastAccessAt)]
          ]} />

          <section className="adminInfoCard">
            <h3>Resumen financiero</h3>
            <div className="adminMiniGrid">
              <AdminMini label="Inversion total" value={money.format(selected.totalInvested)} />
              <AdminMini label="Cobrado total" value={money.format(selected.totalPaid)} />
              <AdminMini label="Grupos activos" value={String(selected.activeGroups)} />
              <AdminMini label="Referidos totales" value={selected.referralSummary} />
            </div>
          </section>

          <section className="adminInfoCard">
            <h3>Bonos generados</h3>
            <div className="adminMiniGrid adminMiniGridCompact">
              <AdminMini label="Total bonos" value={money.format(selected.bonuses)} />
              <AdminMini label="Referidos activos" value={String(selected.activeReferrals)} />
            </div>
          </section>

          <AdminPaymentMethods methods={selected.payoutMethods} />

          <section className="adminInfoCard">
            <h3>Registro de retiro</h3>
            {selected.lastWithdrawal ? (
              <>
                <AdminInfoRows rows={[
                  ["Fecha solicitud", dateTime.format(selected.lastWithdrawal.date)],
                  ["Metodo", selected.lastWithdrawal.method.label],
                  ["Monto solicitado", money.format(selected.lastWithdrawal.amount)],
                  ["Estado", selected.lastWithdrawal.status]
                ]} />
                {selected.lastWithdrawal.status === "Pendiente" ? (
                  <div className="adminWithdrawalActions">
                    <form action={declineWithdrawal}>
                      <input name="paymentId" type="hidden" value={selected.lastWithdrawal.id} />
                      <button className="decline" type="submit">Declinar pago</button>
                    </form>
                    <form action={confirmWithdrawal}>
                      <input name="paymentId" type="hidden" value={selected.lastWithdrawal.id} />
                      <button className="confirm" type="submit">Confirmar pago</button>
                    </form>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="adminEmpty">Sin retiros registrados.</p>
            )}
          </section>

          <div className="adminDetailActions">
            <form action={toggleInvestorStatus}>
              <input name="investorId" type="hidden" value={selected.id} />
              <input name="nextStatus" type="hidden" value={selected.accountStatus === "BLOCKED" ? "ACTIVE" : "BLOCKED"} />
              <button className={selected.accountStatus === "BLOCKED" ? "enable" : "suspend"} type="submit">
                {selected.accountStatus === "BLOCKED" ? "Habilitar cuenta" : "Suspender usuario"}
              </button>
            </form>
          </div>
        </aside>
      ) : null}
    </div>
  );
}

function AdminKpi({ label, value, trend, tone = "good" }: { label: string; value: string; trend: string; tone?: "good" | "warning" }) {
  return (
    <article className="adminKpiCard">
      <span>{label}</span>
      <strong>{value}</strong>
      <small className={tone}>{trend} <em>vs periodo anterior</em></small>
    </article>
  );
}

function AdminPill({ children, tone }: { children: React.ReactNode; tone: string }) {
  return <span className={`adminPill ${tone}`}>{children}</span>;
}

function AdminStatus({ status }: { status: string }) {
  return <span className={`adminStatus ${status.toLowerCase()}`}><i />{status}</span>;
}

function AdminAvatar({ name, src, size }: { name: string; src?: string | null; size: "sm" | "lg" }) {
  const className = size === "lg" ? "adminAvatar" : "adminUserAvatar";

  if (src) {
    return (
      <span className={`${className} hasImage`}>
        <img src={src} alt="" referrerPolicy="no-referrer" />
      </span>
    );
  }

  return <span className={className}>{name.slice(0, 1).toUpperCase()}</span>;
}

function AdminInfo({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <section className="adminInfoCard">
      <h3>{title}</h3>
      <AdminInfoRows rows={rows} />
    </section>
  );
}

function AdminInfoRows({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="adminInfoRows">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

type AdminPaymentMethod = {
  label: string;
  detail: string;
  isPrimary: boolean;
  fields: Array<[string, string]>;
};

function AdminPaymentMethods({ methods }: { methods: AdminPaymentMethod[] }) {
  return (
    <section className="adminInfoCard">
      <h3>Metodos de pago</h3>
      {methods.length ? (
        <div className="adminPaymentMethods">
          {methods.map((method, index) => (
            <article className={method.isPrimary ? "adminPaymentMethodCard primary" : "adminPaymentMethodCard"} key={`${method.label}-${index}`}>
              <div className="adminPaymentMethodTop">
                <div>
                  <strong>{method.label}</strong>
                  <small>{method.detail}</small>
                </div>
                {method.isPrimary ? <AdminPill tone="verificado">Principal</AdminPill> : null}
              </div>
              <dl className="adminPaymentFields">
                {method.fields.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      ) : (
        <p className="adminEmpty">Sin metodos registrados.</p>
      )}
    </section>
  );
}

function AdminMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="adminMini">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function timeAgo(date: Date) {
  const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return `Hace ${Math.round(hours / 24)} d`;
}
