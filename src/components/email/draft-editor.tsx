"use client";

import { AlertTriangle, Check, Clipboard, RefreshCw, Save, Trash2 } from "lucide-react";
import { useState } from "react";

import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime } from "@/lib/format";

export function EmailDraftEditor({
  draft,
  saveAction,
  approveAction,
  discardAction,
  retryPushAction,
}: {
  draft: {
    id: string;
    subject: string;
    body: string;
    status: string;
    providerDraftId?: string | null;
    pushedAt?: Date | null;
    pushError?: string | null;
  };
  saveAction: (formData: FormData) => void | Promise<void>;
  approveAction: (formData: FormData) => void | Promise<void>;
  discardAction: () => void | Promise<void>;
  retryPushAction?: () => void | Promise<void>;
}) {
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);

  return (
    <div className="space-y-4">
      <form action={saveAction} className="space-y-4">
        <input name="draftId" type="hidden" value={draft.id} />
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Asunto</span>
          <input
            className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            name="subject"
            onChange={(event) => setSubject(event.target.value)}
            value={subject}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Respuesta</span>
          <textarea
            className="mt-2 min-h-64 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-6"
            name="body"
            onChange={(event) => setBody(event.target.value)}
            value={body}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <SubmitButton pendingLabel="Guardando" size="sm" variant="outline">
            <Save className="h-4 w-4" aria-hidden />
            Guardar
          </SubmitButton>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium hover:bg-slate-50"
            onClick={() =>
              navigator.clipboard.writeText(`Asunto: ${subject}\n\n${body}`)
            }
            type="button"
          >
            <Clipboard className="h-4 w-4" aria-hidden />
            Copiar
          </button>
        </div>
      </form>
      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <form action={approveAction}>
          <input name="draftId" type="hidden" value={draft.id} />
          <input name="subject" type="hidden" value={subject} />
          <input name="body" type="hidden" value={body} />
          <SubmitButton pendingLabel="Aprobando" size="sm">
            <Check className="h-4 w-4" aria-hidden />
            Aprobar como listo
          </SubmitButton>
        </form>
        <form action={discardAction}>
          <SubmitButton
            pendingLabel="Descartando"
            size="sm"
            variant="ghost"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            Descartar
          </SubmitButton>
        </form>
      </div>
      {draft.status === "APPROVED" && draft.pushedAt && draft.providerDraftId ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          Guardado como borrador en Gmail el {formatDateTime(draft.pushedAt)}.
        </p>
      ) : null}
      {draft.status === "APPROVED" && draft.pushError ? (
        <div className="space-y-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <p className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            {draft.pushError}
          </p>
          <div className="flex flex-wrap gap-2">
            {retryPushAction ? (
              <form action={retryPushAction}>
                <SubmitButton pendingLabel="Reintentando" size="sm" variant="outline">
                  <RefreshCw className="h-4 w-4" aria-hidden />
                  Reintentar
                </SubmitButton>
              </form>
            ) : null}
            {draft.pushError.includes("Reconecta") ? (
              <a
                className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium hover:bg-slate-50"
                href="/api/email/oauth/gmail/start"
              >
                Reconectar Gmail
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
