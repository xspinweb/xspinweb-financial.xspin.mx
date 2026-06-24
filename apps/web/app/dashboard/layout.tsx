import Image from "next/image";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getAppRole, getNavItems } from "../../lib/access";
import { authOptions } from "../../lib/auth";
import { BottomNav } from "./bottom-nav";
import { NotificationsBell } from "./notifications-bell";
import { UserMenu } from "./user-menu";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const userName = session.user?.name ?? "Usuario";
  const userEmail = session.user?.email ?? "";
  const avatar = session.user?.image;
  const role = getAppRole(userEmail);
  const navItems = getNavItems(role);

  return (
    <main className="appShell">
      <section className="appWorkspace">
        <header className="appHeader">
          <Image className="appHeaderLogo" src="/logos/xspin-logo-full.png" alt="Xspin" width={146} height={46} priority />
          <div className="appHeaderActions">
            <NotificationsBell userEmail={userEmail} />
            <UserMenu avatar={avatar} userName={userName} />
          </div>
        </header>
        {children}
      </section>
      <BottomNav items={navItems} />
    </main>
  );
}
