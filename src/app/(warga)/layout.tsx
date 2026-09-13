import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SessionProvider } from "@/components/session-provider";

export const dynamic = "force-dynamic";

export default async function WargaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  // Pengurus RW/RT diarahkan ke dashboard administratif
  if (session.role !== "WARGA") redirect("/dashboard");

  return (
    <SessionProvider
      user={{
        id: session.id,
        email: session.email,
        name: session.name,
        role: session.role,
        rtId: session.rtId,
        rtNumber: session.rtNumber,
        avatarColor: session.avatarColor,
      }}
    >
      {children}
    </SessionProvider>
  );
}
