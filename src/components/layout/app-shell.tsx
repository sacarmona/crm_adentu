import {
  BarChart3,
  BookOpenCheck,
  Bot,
  Building2,
  ClipboardList,
  Contact,
  FileUp,
  Handshake,
  LayoutDashboard,
  Mail,
  MessageCircle,
  MessageSquareText,
  Share2,
  Settings,
  Target,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { signOut } from "@/auth";

type AppShellUser = {
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Empresas", href: "/companies", icon: Building2 },
  { label: "Contactos", href: "/contacts", icon: Contact },
  { label: "Oportunidades", href: "/opportunities", icon: Handshake },
  { label: "Pipeline", href: "/pipeline", icon: Target },
  { label: "Interacciones", href: "/interactions", icon: MessageSquareText },
  { label: "Correo", href: "/email", icon: Mail },
  { label: "WhatsApp", href: "/whatsapp", icon: MessageCircle },
  { label: "LinkedIn", href: "/linkedin", icon: Share2 },
  { label: "Tareas", href: "/tasks", icon: ClipboardList },
  { label: "Mercado", href: "/market", icon: BarChart3 },
  { label: "Inteligencia Comercial", href: "/intelligence", icon: Bot },
  { label: "Playbooks", href: "/playbooks", icon: BookOpenCheck },
  { label: "Importar", href: "/import", icon: FileUp },
  { label: "Configuracion", href: "/settings", icon: Settings },
];

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: AppShellUser;
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
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navigation.map((item) => (
            <Link
              className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
              href={item.href}
              key={item.label}
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
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
