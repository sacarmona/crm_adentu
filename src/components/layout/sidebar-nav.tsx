"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export type PendingCountKey = "email" | "whatsapp" | "webLeads" | "tasks" | "intelligence";

export type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  countKey?: PendingCountKey;
};

export type NavGroup = {
  label?: string;
  items: NavItem[];
};

function NavLink({ item, count }: { item: NavItem; count: number }) {
  return (
    <Link
      className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
      href={item.href}
    >
      <item.icon className="h-4 w-4" aria-hidden="true" />
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
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button
        className="flex h-9 w-full items-center gap-2 rounded-md px-3 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700"
        onClick={() => setOpen((value) => !value)}
        type="button"
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
        <div className="space-y-1 pb-1">
          {group.items.map((item) => (
            <NavLink count={countFor(item, pendingCounts)} item={item} key={item.label} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SidebarNav({
  groups,
  pendingCounts,
}: {
  groups: NavGroup[];
  pendingCounts?: Record<PendingCountKey, number>;
}) {
  return (
    <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
      {groups.map((group, index) =>
        group.label ? (
          <CollapsibleGroup group={group} key={group.label} pendingCounts={pendingCounts} />
        ) : (
          <div className={index > 0 ? "border-t border-slate-100 pt-3" : undefined} key={`ungrouped-${index}`}>
            <div className="space-y-1">
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
