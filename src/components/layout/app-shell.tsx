import Image from "next/image";

import { signOut } from "@/auth";
import { PendingCountKey, SidebarNav } from "@/components/layout/sidebar-nav";

type AppShellUser = {
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

export function AppShell({
  children,
  user,
  pendingCounts,
}: {
  children: React.ReactNode;
  user?: AppShellUser;
  pendingCounts?: Record<PendingCountKey, number>;
}) {
  return (
    <div className="min-h-screen text-slate-900" style={{ background: "var(--background)" }}>
      <aside
        className="fixed inset-y-0 left-0 hidden w-72 flex-col lg:flex"
        style={{ background: "var(--sidebar-bg)" }}
      >
        {/* Logo */}
        <div
          className="flex h-16 shrink-0 items-center gap-3 px-6"
          style={{ borderBottom: "1px solid var(--sidebar-border)" }}
        >
          <Image
            alt="ADENTU"
            height={32}
            priority
            src="/brand/adentu-mark.png"
            width={32}
            style={{ filter: "brightness(0) invert(1)" }}
          />
          <h1 className="text-base font-semibold" style={{ color: "#ffffff" }}>
            CRM Comercial
          </h1>
        </div>

        {/* User */}
        <div
          className="flex shrink-0 items-center justify-between gap-2 px-6 py-3"
          style={{ borderBottom: "1px solid var(--sidebar-border)" }}
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium" style={{ color: "#e2edf8" }}>
              {user?.name ?? "Usuario CRM"}
            </p>
            <p className="truncate text-xs" style={{ color: "#6b92b8" }}>
              {user?.email ?? "sesion activa"}
            </p>
          </div>
          <p
            className="shrink-0 rounded-md px-2 py-1 text-xs font-medium"
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#9bbcde",
            }}
          >
            {user?.role ?? "LECTURA"}
          </p>
        </div>

        <SidebarNav pendingCounts={pendingCounts} role={user?.role} />
      </aside>

      <div className="lg:pl-72">
        {/* Topbar */}
        <header
          className="sticky top-0 z-10 flex h-16 items-center justify-between px-5"
          style={{
            background: "var(--topbar-bg)",
            borderBottom: "1px solid var(--card-border)",
          }}
        >
          <div>
            <p className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#6b92b8" }}>
              <Image alt="ADENTU" height={14} src="/brand/adentu-mark.png" width={14} />
              / CRM Comercial
            </p>
            <h2 className="text-base font-semibold" style={{ color: "#1a2f4a" }}>
              Gestion comercial
            </h2>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              className="rounded-md px-3 py-1 text-sm transition-colors hover:bg-slate-50"
              style={{ border: "1px solid var(--card-border)", color: "#4a72a0" }}
            >
              Cerrar sesion
            </button>
          </form>
        </header>

        <main className="p-5">{children}</main>
      </div>
    </div>
  );
}
