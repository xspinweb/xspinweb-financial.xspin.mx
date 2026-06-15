import { getServerSession } from "next-auth";
import { getRoleLabel, getAppRole } from "../../../lib/access";
import { authOptions } from "../../../lib/auth";
import { ProfileDashboard } from "./profile-dashboard";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email ?? "usuario";
  const userName = session?.user?.name ?? "Usuario";
  const role = getRoleLabel(getAppRole(userEmail));

  return (
    <div className="dashboardContent profilePage">
      <section className="profileHero">
        <h1>Mi perfil</h1>
        <p>Administra tu informacion personal, seguridad y verificacion de identidad.</p>
      </section>
      <ProfileDashboard userEmail={userEmail} userName={userName} role={role} />
    </div>
  );
}
