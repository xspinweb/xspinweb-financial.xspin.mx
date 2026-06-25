import Link from "next/link";
import { getAdminDashboardData } from "../../../lib/admin-data";

export const dynamic = "force-dynamic";

export default async function AdminKycPage() {
  const data = await getAdminDashboardData();
  const pending = data.users.filter((user) => user.kyc !== "Verificado");

  return (
    <section className="adminPanel adminRoutePage">
      <div className="adminPanelHeader">
        <div>
          <span className="adminEyebrow">KYC</span>
          <h1>Validaciones pendientes</h1>
        </div>
      </div>
      <div className="adminCardGrid">
        {pending.length ? pending.map((user) => (
          <article className="adminUserReviewCard" key={user.id}>
            <span className={`adminPill ${user.kyc.toLowerCase()}`}>{user.kyc}</span>
            <h2>{user.fullName}</h2>
            <p>{user.email}</p>
            <div>
              <span>INE anverso</span>
              <span>INE reverso</span>
              <span>Comprobante domicilio</span>
              <span>Selfie</span>
            </div>
            <Link href={`/admin/dashboard?user=${user.id}`}>Revisar documentos</Link>
          </article>
        )) : <p className="adminEmpty">No hay KYC pendientes.</p>}
      </div>
    </section>
  );
}
