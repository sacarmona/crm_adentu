"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

export type ChannelCardItem = { id: string | null; label: string };

export function ChannelCard({
  icon,
  label,
  count,
  barPct,
  active,
  iconClass,
  dotClass,
  items,
}: {
  icon: ReactNode;
  label: string;
  count: number;
  barPct: number;
  active: boolean;
  iconClass: string;
  dotClass: string;
  items: ChannelCardItem[];
}) {
  const [open, setOpen] = useState(false);
  const showPopup = open && count > 0 && items.length > 0;

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div
        className={`flex flex-col gap-1.5 rounded-md border bg-white p-2.5 transition-shadow ${
          active ? "border-slate-200 hover:shadow-md" : "border-slate-100 opacity-60"
        }`}
      >
        <div className="flex items-center justify-between gap-1">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-md border ${
              active ? iconClass : "border-slate-100 bg-slate-50 text-slate-400"
            }`}
          >
            {icon}
          </span>
          <span className="text-base font-bold tabular-nums text-slate-900">{count}</span>
        </div>
        <p className="truncate text-[11px] leading-tight text-slate-500" title={label}>
          {label}
        </p>
        <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${dotClass}`} style={{ width: `${barPct}%` }} />
        </div>
      </div>

      {showPopup ? (
        <div className="absolute left-1/2 top-full z-30 mt-1 w-64 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-md border border-slate-200 bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <span className="text-xs font-semibold text-slate-700">{label}</span>
            <span className="text-xs font-bold text-slate-500">{count} interacc.</span>
          </div>
          <ul className="max-h-56 space-y-1 overflow-auto text-xs">
            {items.slice(0, 15).map((item, index) => (
              <li key={item.id ?? `c-${index}`} className="truncate">
                {item.id ? (
                  <Link
                    className="text-slate-600 hover:text-blue-600 hover:underline"
                    href={`/opportunities/${item.id}`}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-slate-400">{item.label}</span>
                )}
              </li>
            ))}
          </ul>
          {items.length > 15 ? (
            <p className="mt-2 border-t border-slate-100 pt-2 text-[11px] text-slate-400">
              +{items.length - 15} más
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
