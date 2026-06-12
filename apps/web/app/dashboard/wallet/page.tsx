import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { WalletDashboard } from "./wallet-dashboard";

export default async function WalletPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="dashboardContent walletPage">
      <section className="walletHero">
        <span className="loginEyebrow">Cartera</span>
        <h1>Cartera</h1>
        <p>Gestiona los metodos de pago donde recibiras tus ganancias.</p>
      </section>
      <WalletDashboard userEmail={session?.user?.email ?? "usuario"} />
    </div>
  );
}
