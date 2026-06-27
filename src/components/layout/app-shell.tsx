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
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 px-6">
          <Image
            alt="ADENTU"
            height={32}
            priority
            src="/brand/adentu-mark.png"
            width={32}
          />
          <h1 className="text-lg font-semibold">CRM Comercial</h1>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-6 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-950">
              {user?.name ?? "Usuario CRM"}
            </p>
            <p className="truncate text-xs text-slate-500">
              {user?.email ?? "sesion activa"}
            </p>
          </div>
          <p className="shrink-0 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600">
            {user?.role ?? "LECTURA"}
          </p>
        </div>
        <SidebarNav pendingCounts={pendingCounts} />
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Image alt="ADENTU" height={14} src="/brand/adentu-mark.png" width={14} />
              / CRM Comercial
            </p>
            <h2 className="text-base font-semibold">Gestion comercial</h2>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="rounded-md border border-slate-200 px-3 py-1 text-sm text-slate-600 transition-colors hover:bg-slate-50">
              Cerrar sesion
            </button>
          </form>
        </header>
        <main className="p-5">{children}</main>
      </div>
    </div>
  );
}
