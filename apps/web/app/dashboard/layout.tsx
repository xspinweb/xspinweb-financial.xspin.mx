import Image from "next/image";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getAppRole, getNavItems } from "../../lib/access";
import { authOptions } from "../../lib/auth";
import { BottomNav } from "./bottom-nav";
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
            <button className="notificationButton" type="button" aria-label="Notificaciones">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 22a2.8 2.8 0 0 0 2.7-2h-5.4A2.8 2.8 0 0 0 12 22Zm7-6.4V11a7 7 0 0 0-5.2-6.8V3a1.8 1.8 0 1 0-3.6 0v1.2A7 7 0 0 0 5 11v4.6L3.3 18v.9h17.4V18Z" />
              </svg>
              <span />
            </button>
            <UserMenu avatar={avatar} userName={userName} />
          </div>
        </header>
        {children}
      </section>
      <BottomNav items={navItems} />
    </main>
  );
}
