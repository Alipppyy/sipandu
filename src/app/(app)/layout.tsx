import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  // Akun warga memiliki portal sendiri yang hanya menampilkan data miliknya
  if (session.role === "WARGA") redirect("/warga");

  const user = {
    id: session.id,
    email: session.email,
    name: session.name,
    role: session.role,
    rtId: session.rtId,
    rtNumber: session.rtNumber,
    avatarColor: session.avatarColor,
  };

  return <AppShell user={user}>{children}</AppShell>;
}
