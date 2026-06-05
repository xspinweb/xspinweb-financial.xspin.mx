import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="dashboardShell">
      <section className="dashboardPanel">
        <span className="loginEyebrow">Panel interno</span>
        <h1>Dashboard operativo</h1>
        <p>Sesion iniciada con Google. El panel de inversionistas queda listo para la siguiente etapa.</p>
      </section>
    </main>
  );
}
