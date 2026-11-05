"use client";

import { LeadStatus } from "@prisma/client";
import { useState, useTransition } from "react";

import { leadStatusLabels } from "@/lib/labels";

const styles: Record<LeadStatus, string> = {
  NUEVO: "border-sky-200 bg-sky-50 text-sky-700",
  SIN_RESPUESTA: "border-orange-200 bg-orange-50 text-orange-700",
  CONTACTADO: "border-amber-200 bg-amber-50 text-amber-700",
  CALIFICADO: "border-violet-200 bg-violet-50 text-violet-700",
  CONVERTIDO: "border-emerald-200 bg-emerald-50 text-emerald-700",
  DESCARTADO: "border-slate-200 bg-slate-100 text-slate-500",
};

export function LeadStatusSelect({
  action,
  defaultValue,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaultValue: LeadStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState<LeadStatus>(defaultValue);

  return (
    <form action={(formData) => startTransition(() => action(formData))}>
      <select
        className={`h-8 w-full rounded-md border px-2 text-xs font-semibold outline-none disabled:opacity-60 ${styles[value]}`}
        disabled={isPending}
        name="status"
        onChange={(event) => {
          setValue(event.currentTarget.value as LeadStatus);
          event.currentTarget.form?.requestSubmit();
        }}
        value={value}
      >
        {Object.values(LeadStatus).map((status) => (
          <option className="bg-white text-slate-700" key={status} value={status}>
            {leadStatusLabels[status]}
          </option>
        ))}
      </select>
    </form>
  );
}
