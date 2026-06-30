"use client";

import { EmailDiscardRuleType } from "@prisma/client";
import { ChevronDown, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  createDiscardRuleFromMessage,
  discardEmailMessage,
} from "@/server/actions/email";

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

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex h-7 items-center gap-1 rounded-md border border-slate-300 px-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        Descartar
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-1.5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Descartar</span>
            <button onClick={() => setOpen(false)} type="button" className="text-slate-400 hover:text-slate-600">
              <X className="h-3 w-3" />
            </button>
          </div>

          <form action={discardEmailMessage.bind(null, messageId)}>
            <button
              className="w-full px-3 py-2.5 text-left text-xs text-slate-700 hover:bg-slate-50 border-b border-slate-100"
              type="submit"
              onClick={() => setOpen(false)}
            >
              <span className="font-medium block">Solo este correo</span>
              <span className="text-slate-400">Descarta solo este mensaje</span>
            </button>
          </form>

          <form action={createDiscardRuleFromMessage}>
            <input type="hidden" name="messageId" value={messageId} />
            <input type="hidden" name="type" value={EmailDiscardRuleType.SENDER_EXACT} />
            <button
              className="w-full px-3 py-2.5 text-left text-xs text-slate-700 hover:bg-slate-50 border-b border-slate-100"
              type="submit"
              onClick={() => setOpen(false)}
            >
              <span className="font-medium block">Remitente exacto</span>
              <span className="block truncate text-slate-400">{fromAddress}</span>
            </button>
          </form>

          <form action={createDiscardRuleFromMessage}>
            <input type="hidden" name="messageId" value={messageId} />
            <input type="hidden" name="type" value={EmailDiscardRuleType.SENDER_DOMAIN} />
            <button
              className="w-full px-3 py-2.5 text-left text-xs text-slate-700 hover:bg-slate-50 border-b border-slate-100"
              type="submit"
              onClick={() => setOpen(false)}
            >
              <span className="font-medium block">Dominio del remitente</span>
              <span className="text-slate-400">@{domain}</span>
            </button>
          </form>

          {subject ? (
            <form action={createDiscardRuleFromMessage}>
              <input type="hidden" name="messageId" value={messageId} />
              <input type="hidden" name="type" value={EmailDiscardRuleType.SUBJECT_CONTAINS} />
              <button
                className="w-full px-3 py-2.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                type="submit"
                onClick={() => setOpen(false)}
              >
                <span className="font-medium block">Por asunto</span>
                <span className="block truncate text-slate-400">{subject}</span>
              </button>
            </form>
          ) : null}
        </div>
      )}
    </div>
  );
}
