import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { getSidebarPendingCounts } from "@/server/services/sidebar-counts";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const pendingCounts = await getSidebarPendingCounts(session.user.id);

  return (
    <AppShell pendingCounts={pendingCounts} user={session.user}>
      {children}
    </AppShell>
  );
}
