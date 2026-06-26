import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { getAppRole } from "../../lib/access";
import { ensureInvestorAccount } from "../../lib/investor-account";

const adminNav = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Usuarios", href: "/admin/usuarios" },
  { label: "Retiros", href: "/admin/retiros" },
  { label: "KYC", href: "/admin/kyc" },
  { label: "Grupos", href: "/admin/grupos" },
  { label: "Configuracion", href: "/admin/configuracion" }
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  if (getAppRole(session.user.email) !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  await ensureInvestorAccount({
    email: session.user.email,
    name: session.user.name,
    image: session.user.image
  });

  return (
    <main className="adminShell">
      <aside className="adminSidebar">
        <Link className="adminLogo" href="/admin/dashboard" aria-label="XSpin admin">
          <Image src="/logos/xspin-logo-full.png" alt="XSpin" width={152} height={56} priority />
        </Link>
        <nav className="adminNav" aria-label="Administrador">
          {adminNav.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <Link className="adminBackLink" href="/dashboard">
          Ver app
        </Link>
      </aside>
      <section className="adminWorkspace">{children}</section>
    </main>
  );
}
