"use client";

import { EmailDiscardRuleType } from "@prisma/client";
import { CheckCircle, ChevronDown, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  createDiscardRuleFromMessage,
  discardEmailMessage,
} from "@/server/actions/email";

type DiscardOption =
  | { kind: "message" }
  | { kind: "rule"; type: EmailDiscardRuleType };

export function DiscardDropdown({
  messageId,
  fromAddress,
  subject,
}: {
  messageId: string;
  fromAddress: string;
  subject: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const domain = fromAddress.includes("@") ? fromAddress.split("@")[1] : fromAddress;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function run(option: DiscardOption) {
    startTransition(async () => {
      if (option.kind === "message") {
        await discardEmailMessage(messageId);
      } else {
        const fd = new FormData();
        fd.append("messageId", messageId);
        fd.append("type", option.type);
        await createDiscardRuleFromMessage(fd);
      }
      setOpen(false);
      setDone(true);
    });
  }

  if (done) {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
        <CheckCircle className="h-3.5 w-3.5" />
        Descartado
      </span>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex h-7 items-center gap-1 rounded-md border border-slate-300 px-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        {pending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <>
            Descartar
            <ChevronDown className="h-3 w-3" />
          </>
        )}
      </button>

      {open && !pending && (
        <div className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Descartar
            </span>
            <button
              className="text-slate-400 hover:text-slate-600"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          <button
            className="w-full border-b border-slate-100 px-3 py-2.5 text-left text-xs text-slate-700 hover:bg-slate-50"
            onClick={() => run({ kind: "message" })}
            type="button"
          >
            <span className="block font-medium">Solo este correo</span>
            <span className="text-slate-400">Descarta solo este mensaje</span>
          </button>

          <button
            className="w-full border-b border-slate-100 px-3 py-2.5 text-left text-xs text-slate-700 hover:bg-slate-50"
            onClick={() => run({ kind: "rule", type: EmailDiscardRuleType.SENDER_EXACT })}
            type="button"
          >
            <span className="block font-medium">Remitente exacto</span>
            <span className="block truncate text-slate-400">{fromAddress}</span>
          </button>

          <button
            className="w-full border-b border-slate-100 px-3 py-2.5 text-left text-xs text-slate-700 hover:bg-slate-50"
            onClick={() => run({ kind: "rule", type: EmailDiscardRuleType.SENDER_DOMAIN })}
            type="button"
          >
            <span className="block font-medium">Dominio del remitente</span>
            <span className="text-slate-400">@{domain}</span>
          </button>

          {subject ? (
            <button
              className="w-full px-3 py-2.5 text-left text-xs text-slate-700 hover:bg-slate-50"
              onClick={() => run({ kind: "rule", type: EmailDiscardRuleType.SUBJECT_CONTAINS })}
              type="button"
            >
              <span className="block font-medium">Por asunto</span>
              <span className="block truncate text-slate-400">{subject}</span>
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
