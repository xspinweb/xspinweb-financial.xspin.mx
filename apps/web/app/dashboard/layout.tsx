import Image from "next/image";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../lib/auth";

const navItems = [
  {
    label: "Inicio",
    href: "/dashboard",
    icon: "home"
  },
  {
    label: "Inversores",
    href: "#",
    icon: "users"
  },
  {
    label: "Pagos",
    href: "#",
    icon: "wallet"
  },
  {
    label: "Grupos",
    href: "#",
    icon: "grid"
  },
  {
    label: "Reportes",
    href: "#",
    icon: "chart"
  }
];

function NavIcon({ name }: { name: string }) {
  if (name === "home") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 10.8 12 3l9 7.8v9.7a1 1 0 0 1-1 1h-5.2v-6.4H9.2v6.4H4a1 1 0 0 1-1-1z" />
      </svg>
    );
  }

  if (name === "users") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9.8 11.2a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2.4c-3.9 0-7 2-7 4.4v1.1c0 .7.5 1.2 1.2 1.2h11.6c.7 0 1.2-.5 1.2-1.2V18c0-2.4-3.1-4.4-7-4.4Zm7-2.2a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6Zm1.2 2.3c1.9.5 3.2 1.7 3.2 3.1v.8c0 .6-.5 1-1 1h-1.8V18c0-1.7-.8-3.2-2.2-4.4.5-.1 1.1-.1 1.8.1Z" />
      </svg>
    );
  }

  if (name === "wallet") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 7.3A2.8 2.8 0 0 1 5.8 4h13.4v3H6.1c-.6 0-1 .4-1 1s.4 1 1 1H20a2 2 0 0 1 2 2v6.5a2.5 2.5 0 0 1-2.5 2.5H5.8A2.8 2.8 0 0 1 3 17.2Zm14.8 6.5a1.4 1.4 0 1 0 0 2.8h1.7v-2.8Z" />
      </svg>
    );
  }

  if (name === "grid") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 4h7v7H4Zm9 0h7v7h-7ZM4 13h7v7H4Zm9 0h7v7h-7Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 19h16v2H4a1 1 0 0 1-1-1V4h2Zm2.4-3.4 3.5-4.4 3.3 2.6 4.1-6.2 1.7 1.1-5.3 8-3.4-2.7-3.7 4.6Z" />
    </svg>
  );
}

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
      <section className="appWorkspace">
        <header className="appHeader">
          <Image src="/logos/xspin-logo.svg" alt="Xspin" width={116} height={32} priority />
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
      <nav className="bottomNav" aria-label="Navegacion principal">
        {navItems.map((item) => (
          <a className={item.href === "/dashboard" ? "active" : ""} href={item.href} key={item.label}>
            <NavIcon name={item.icon} />
            <span>{item.label}</span>
          </a>
        ))}
      </nav>
    </main>
  );
}
