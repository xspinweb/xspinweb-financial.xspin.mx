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
          <Image src="/logos/xspin-logo.svg" alt="Xspin" width={116} height={32} priority />
          <UserMenu avatar={avatar} userName={userName} />
        </header>
        {children}
      </section>
      <BottomNav items={navItems} />
    </main>
  );
}
