import { redirect } from "next/navigation";

export default function AdminUserDetailPage({ params }: { params: { id: string } }) {
  redirect(`/admin/dashboard?user=${params.id}`);
}
