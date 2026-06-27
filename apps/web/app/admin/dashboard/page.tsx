import Link from "next/link";
import { confirmWithdrawal, declineWithdrawal, toggleInvestorStatus, updateKycDocumentStatus } from "../actions";
import { getAdminDashboardData } from "../../../lib/admin-data";
import { AdminRealtimeRefresh } from "./admin-realtime-refresh";

export const dynamic = "force-dynamic";

type AdminDashboardPageProps = {
  searchParams?: {
    user?: string;
    tab?: string;
    query?: string;
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

const adminTabs = [
  ["resumen", "Resumen"],
  ["inversiones", "Inversiones"],
  ["bonos", "Bonos"],
  ["wallet", "Wallet"],
  ["metodos", "Metodos de pago"],
  ["documentos", "Documentos"],
  ["actividad", "Actividad"]
] as const;

type AdminTab = typeof adminTabs[number][0];

function getAdminTab(tab?: string): AdminTab {
  return adminTabs.some(([key]) => key === tab) ? tab as AdminTab : "resumen";
}

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
  const data = await getAdminDashboardData(searchParams?.user);
  const selected = searchParams?.user ? data.users.find((user) => user.id === searchParams.user) ?? null : null;
  const activeTab = getAdminTab(searchParams?.tab);
  const searchQuery = (searchParams?.query ?? "").trim().toLowerCase();
  const queryParam = searchParams?.query ? `&query=${encodeURIComponent(searchParams.query)}` : "";
  const visibleUsers = searchQuery
    ? data.users.filter((user) => [
      user.labelId,
      user.fullName,
      user.userName,
      user.email,
      user.phone,
      user.country,
      user.city,
      user.level
    ].some((value) => String(value ?? "").toLowerCase().includes(searchQuery)))
    : data.users;

  return (
    <div className={selected ? "adminDashboard hasDetail" : "adminDashboard"}>
      <AdminRealtimeRefresh />
      <section className="adminMain">
        <header className="adminTopbar">
          <div>
            <span>Administrador</span>
            <h1>Panel general</h1>
          </div>
          <form action="/admin/dashboard" className="adminSearch">
            <input defaultValue={searchParams?.query ?? ""} name="query" placeholder="Buscar usuario..." />
            <button type="submit">Buscar</button>
          </form>
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
                {visibleUsers.length ? visibleUsers.map((user) => (
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
                    <td><Link className="adminIconLink" href={`/admin/dashboard?user=${user.id}${queryParam}`}>Ver</Link></td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={11}>{searchQuery ? "No encontramos usuarios con esa busqueda." : "Aun no hay usuarios registrados."}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {selected ? (
        <aside className="adminDetailPanel">
          <Link className="adminDetailClose" href={`/admin/dashboard${searchParams?.query ? `?query=${encodeURIComponent(searchParams.query)}` : ""}`} aria-label="Cerrar detalle">x</Link>
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
          </div>

          <div className="adminTabs">
            {adminTabs.map(([key, label]) => (
              <Link className={activeTab === key ? "active" : ""} href={`/admin/dashboard?user=${selected.id}&tab=${key}${queryParam}`} key={key}>
                {label}
              </Link>
            ))}
          </div>

          {activeTab === "resumen" ? (
            <>
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
            </>
          ) : null}

          {activeTab === "inversiones" ? <AdminInvestments investments={selected.investments} /> : null}
          {activeTab === "bonos" ? <AdminBonuses bonuses={selected.bonusItems} total={selected.bonuses} /> : null}
          {activeTab === "wallet" ? <AdminWallet selected={selected} /> : null}
          {activeTab === "metodos" ? <AdminPaymentMethods methods={selected.payoutMethods} /> : null}
          {activeTab === "documentos" ? <AdminDocuments investorId={selected.id} verification={selected.identityVerification} /> : null}
          {activeTab === "actividad" ? <AdminActivity notifications={selected.notifications} /> : null}

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

function AdminInvestments({ investments }: { investments: Array<Record<string, any>> }) {
  return (
    <section className="adminInfoCard">
      <h3>Inversiones</h3>
      {investments.length ? (
        <div className="adminMovementList">
          {investments.map((investment) => (
            <article className="adminMovementCard" key={investment.id}>
              <div>
                <strong>{investment.group}</strong>
                <span>Semana {investment.week}</span>
              </div>
              <div>
                <small>{investment.type}</small>
                <b>{money.format(investment.principal)}</b>
              </div>
              <em className={investment.type === "Reinversion" ? "adminMovementTag reinvestment" : "adminMovementTag investment"}>
                {investment.type}
              </em>
            </article>
          ))}
        </div>
      ) : (
        <p className="adminEmpty">Sin inversiones registradas.</p>
      )}
    </section>
  );
}

function AdminBonuses({ bonuses, total }: { bonuses: Array<Record<string, any>>; total: number }) {
  return (
    <section className="adminInfoCard">
      <h3>Bonos</h3>
      <AdminMini label="Total bonos" value={money.format(total)} />
      {bonuses.length ? (
        <div className="adminMovementList">
          {bonuses.map((bonus, index) => (
            <article className="adminMovementCard" key={`${bonus.referredName}-${index}`}>
              <div>
                <strong>{bonus.referredName}</strong>
                <span>{bonus.group} · Semana {bonus.week}</span>
              </div>
              <b>{money.format(bonus.amount)}</b>
            </article>
          ))}
        </div>
      ) : (
        <p className="adminEmpty">Sin bonos registrados.</p>
      )}
    </section>
  );
}

function AdminWallet({ selected }: { selected: Record<string, any> }) {
  return (
    <>
      <section className="adminInfoCard">
        <h3>Wallet</h3>
        <AdminMini label="Saldo en wallet" value={money.format(selected.walletBalance)} />
      </section>

      <section className="adminInfoCard">
        <h3>Registro de retiro</h3>
        {selected.lastWithdrawal ? (
          <>
            <AdminInfoRows rows={[
              ["Fecha solicitud", dateTime.format(selected.lastWithdrawal.date)],
              ["Metodo", selected.lastWithdrawal.method.label],
              ["Monto solicitado", money.format(Math.abs(selected.lastWithdrawal.amount))],
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
    </>
  );
}

function AdminDocuments({ investorId, verification }: { investorId: string; verification: unknown }) {
  const record = verification && typeof verification === "object" ? verification as Record<string, any> : null;
  const documents = [
    {
      key: "official",
      title: "Identificacion oficial",
      status: record?.status,
      files: [
        ["Anverso", record?.officialIdFront],
        ["Reverso", record?.officialIdBack]
      ] as Array<[string, string | undefined]>
    },
    {
      key: "proof",
      title: "Comprobante de domicilio",
      status: record?.proofOfAddressStatus,
      files: [["Archivo", record?.proofOfAddressFile]] as Array<[string, string | undefined]>
    },
    {
      key: "selfie",
      title: "Selfie",
      status: record?.selfieStatus,
      files: [["Selfie", record?.selfieImage]] as Array<[string, string | undefined]>
    }
  ];

  return (
    <section className="adminInfoCard">
      <h3>Documentos</h3>
      <div className="adminDocumentList">
        {documents.map((document) => (
          <article className="adminDocumentCard" key={document.key}>
            <div className="adminDocumentTop">
              <strong>{document.title}</strong>
              <AdminPill tone={String(document.status ?? "pendiente").toLowerCase()}>{getDocumentLabel(document.status)}</AdminPill>
            </div>
            <div className="adminDocumentPreviews">
              {document.files.map(([label, src]) => <AdminDocumentPreview key={label} label={label} src={src} />)}
            </div>
            {document.files.some(([, src]) => src) ? (
              <div className="adminWithdrawalActions">
                <form action={updateKycDocumentStatus}>
                  <input name="investorId" type="hidden" value={investorId} />
                  <input name="document" type="hidden" value={document.key} />
                  <input name="status" type="hidden" value="REJECTED" />
                  <button className="decline" type="submit">Rechazar</button>
                </form>
                <form action={updateKycDocumentStatus}>
                  <input name="investorId" type="hidden" value={investorId} />
                  <input name="document" type="hidden" value={document.key} />
                  <input name="status" type="hidden" value="VERIFIED" />
                  <button className="confirm" type="submit">Aprobar</button>
                </form>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function AdminDocumentPreview({ label, src }: { label: string; src?: string }) {
  if (!src) {
    return <div className="adminDocumentPreview empty">{label}: sin archivo</div>;
  }

  if (src.startsWith("data:image")) {
    return (
      <a className="adminDocumentPreview image" href={src} target="_blank" rel="noreferrer" title={`Ver ${label} en grande`}>
        <img src={src} alt={label} />
        <span>{label}</span>
      </a>
    );
  }

  return <a className="adminDocumentPreview file" href={src} target="_blank" rel="noreferrer">{label}: ver archivo</a>;
}

function AdminActivity({ notifications }: { notifications: Array<{ id: string; title: string; message: string; createdAt: Date }> }) {
  return (
    <section className="adminInfoCard">
      <h3>Actividad</h3>
      {notifications.length ? (
        <div className="adminMovementList">
          {notifications.map((notification) => (
            <article className="adminMovementCard" key={notification.id}>
              <div>
                <strong>{notification.title}</strong>
                <span>{notification.message}</span>
              </div>
              <small>{timeAgo(notification.createdAt)}</small>
            </article>
          ))}
        </div>
      ) : (
        <p className="adminEmpty">Sin actividad reciente.</p>
      )}
    </section>
  );
}

function getDocumentLabel(status?: string) {
  if (status === "VERIFIED") return "Aprobado";
  if (status === "REJECTED") return "Rechazado";
  if (status === "SUBMITTED") return "Validacion";
  return "Pendiente";
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
