import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { WalletDashboard } from "./wallet-dashboard";

export default async function WalletPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="dashboardContent walletPage">
      <section className="walletHero">
        <h1>Mi wallet</h1>
        <p>Administra tus saldos y proximos pagos.</p>
      </section>
      <WalletDashboard userEmail={session?.user?.email ?? "usuario"} />
    </div>
  );
}
