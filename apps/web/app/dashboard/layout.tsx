import Image from "next/image";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../lib/auth";

const navItems = [
  "Dashboard",
  "Inversionistas",
  "Pagos",
  "Grupos",
  "Reportes",
  "Configuracion"
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const userName = session.user?.name ?? "Usuario";
  const userEmail = session.user?.email ?? "";
  const avatar = session.user?.image;

  return (
    <main className="appShell">
      <aside className="appSidebar">
        <div className="appBrand">
          <Image src="/logos/xspin-logo.svg" alt="Xspin" width={138} height={38} priority />
        </div>
        <nav className="appNav" aria-label="Navegacion del panel">
          {navItems.map((item) => (
            <a className={item === "Dashboard" ? "active" : ""} href="#" key={item}>
              {item}
            </a>
          ))}
        </nav>
      </aside>

      <section className="appWorkspace">
        <header className="appHeader">
          <div>
            <span>Panel interno</span>
            <strong>Operacion financiera</strong>
          </div>
          <div className="userBox">
            {avatar ? (
              <img
                src={avatar}
                alt=""
                width={38}
                height={38}
                className="userAvatar"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="userFallback">{userName.charAt(0)}</span>
            )}
            <div>
              <strong>{userName}</strong>
              <span>{userEmail}</span>
            </div>
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}
