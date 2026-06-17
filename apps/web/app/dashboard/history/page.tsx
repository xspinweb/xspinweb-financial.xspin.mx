import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { HistoryDashboard } from "./history-dashboard";

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);
  const userName = session?.user?.name ?? "Usuario";
  const userEmail = session?.user?.email ?? "";

  return (
    <div className="dashboardContent">
      <HistoryDashboard userEmail={userEmail} userName={userName} />
    </div>
  );
}
