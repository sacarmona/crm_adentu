"use client";

import {
  BarChart3,
  BookOpenCheck,
  Bot,
  Building2,
  ChevronDown,
  ClipboardList,
  Contact,
  FileUp,
  Globe2,
  Handshake,
  LayoutDashboard,
  Mail,
  MessageCircle,
  MessageSquareText,
  Settings,
  Share2,
  Target,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export type PendingCountKey = "email" | "whatsapp" | "webLeads" | "tasks" | "intelligence";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  countKey?: PendingCountKey;
};

type NavGroup = {
  label?: string;
  items: NavItem[];
};

const navigationGroups: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Pipeline", href: "/pipeline", icon: Target },
    ],
  },
  {
    label: "Comercial",
    items: [
      { label: "Empresas", href: "/companies", icon: Building2 },
      { label: "Contactos", href: "/contacts", icon: Contact },
      { label: "Oportunidades", href: "/opportunities", icon: Handshake },
      { label: "Mercado", href: "/market", icon: BarChart3 },
    ],
  },
  {
    label: "Fuentes",
    items: [
      { label: "Leads web", href: "/web-leads", icon: Globe2, countKey: "webLeads" },
      { label: "Correo", href: "/email", icon: Mail, countKey: "email" },
      { label: "WhatsApp", href: "/whatsapp", icon: MessageCircle, countKey: "whatsapp" },
      { label: "Reuniones", href: "/meetings", icon: Video },
      { label: "LinkedIn", href: "/linkedin", icon: Share2 },
    ],
  },
  {
    label: "Actividad",
    items: [
      { label: "Interacciones", href: "/interactions", icon: MessageSquareText },
      { label: "Tareas", href: "/tasks", icon: ClipboardList, countKey: "tasks" },
    ],
  },
  {
    label: "Estrategia",
    items: [
      { label: "Playbooks", href: "/playbooks", icon: BookOpenCheck },
      {
        label: "Inteligencia Comercial",
        href: "/intelligence",
        icon: Bot,
        countKey: "intelligence",
      },
    ],
  },
  {
    label: "Sistema",
    items: [
      { label: "Importar", href: "/import", icon: FileUp },
      { label: "Configuracion", href: "/settings", icon: Settings },
    ],
  },
];

function NavLink({ item, count }: { item: NavItem; count: number }) {
  return (
    <Link
      className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors"
      href={item.href}
      style={{ color: "var(--sidebar-text)" }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = "rgba(255,255,255,0.06)";
        el.style.color = "#c8daf0";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = "";
        el.style.color = "var(--sidebar-text)";
      }}
    >
      <item.icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1">{item.label}</span>
      {count > 0 ? (
        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}

function countFor(item: NavItem, pendingCounts?: Record<PendingCountKey, number>) {
  return item.countKey ? pendingCounts?.[item.countKey] ?? 0 : 0;
}

function CollapsibleGroup({
  group,
  pendingCounts,
}: {
  group: NavGroup;
  pendingCounts?: Record<PendingCountKey, number>;
}) {
  const groupPending = group.items.reduce(
    (total, item) => total + countFor(item, pendingCounts),
    0,
  );
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        className="flex h-9 w-full items-center gap-2 rounded-md px-3 text-xs font-semibold uppercase tracking-wide transition-colors"
        style={{ color: "var(--sidebar-text-muted)" }}
        onClick={() => setOpen((value) => !value)}
        type="button"
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#9bbcde")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--sidebar-text-muted)")}
      >
        <span className="flex-1 text-left">{group.label}</span>
        {groupPending > 0 ? (
          <span aria-label="Pendientes en este grupo" className="h-2 w-2 rounded-full bg-amber-500" />
        ) : null}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "" : "-rotate-90"}`}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div className="space-y-0.5 pb-1">
          {group.items.map((item) => (
            <NavLink count={countFor(item, pendingCounts)} item={item} key={item.label} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SidebarNav({
  pendingCounts,
}: {
  pendingCounts?: Record<PendingCountKey, number>;
}) {
  return (
    <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
      {navigationGroups.map((group, index) =>
        group.label ? (
          <CollapsibleGroup group={group} key={group.label} pendingCounts={pendingCounts} />
        ) : (
          <div
            key={`ungrouped-${index}`}
            className={index > 0 ? "pt-3" : undefined}
            style={index > 0 ? { borderTop: "1px solid rgba(255,255,255,0.07)" } : undefined}
          >
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink count={countFor(item, pendingCounts)} item={item} key={item.label} />
              ))}
            </div>
          </div>
        ),
      )}
    </nav>
  );
}
