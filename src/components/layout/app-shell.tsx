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
  MessageSquareText,
  Settings,
  Target,
} from "lucide-react";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Empresas", icon: Building2 },
  { label: "Contactos", icon: Contact },
  { label: "Oportunidades", icon: Handshake },
  { label: "Pipeline", icon: Target },
  { label: "Interacciones", icon: MessageSquareText },
  { label: "Tareas", icon: ClipboardList },
  { label: "Mercado", icon: BarChart3 },
  { label: "Inteligencia Comercial", icon: Bot },
  { label: "Playbooks", icon: BookOpenCheck },
  { label: "Importar", icon: FileUp },
  { label: "Configuracion", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-16 items-center border-b border-slate-200 px-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              ADENTU
            </p>
            <h1 className="text-lg font-semibold">CRM Comercial</h1>
          </div>
        </div>
        <nav className="space-y-1 px-3 py-4">
          {navigation.map((item) => (
            <a
              className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
              href="#"
              key={item.label}
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5">
          <div>
            <p className="text-xs font-medium text-slate-500">
              Inicio / Fase 0
            </p>
            <h2 className="text-base font-semibold">Base tecnica del CRM</h2>
          </div>
          <div className="rounded-md border border-slate-200 px-3 py-1 text-sm text-slate-600">
            MVP en preparacion
          </div>
        </header>
        <main className="p-5">{children}</main>
      </div>
    </div>
  );
}

