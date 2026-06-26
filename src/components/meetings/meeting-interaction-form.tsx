"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";

function localDateTimeValue(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function MeetingInteractionForm({
  action,
  ignoreAction,
  companyId,
  contactId,
  opportunityId,
  serviceId,
  minutes,
  defaultNextAction,
}: {
  action: (formData: FormData) => void | Promise<void>;
  ignoreAction: (formData: FormData) => void | Promise<void>;
  companyId?: string | null;
  contactId?: string | null;
  opportunityId?: string | null;
  serviceId?: string | null;
  minutes?: string | null;
  defaultNextAction: string;
}) {
  const [nextAction, setNextAction] = useState(defaultNextAction);
  const [nextActionDate, setNextActionDate] = useState(() =>
    localDateTimeValue(new Date(Date.now() + 24 * 60 * 60 * 1000)),
  );

  return (
    <form
      action={action}
      className="mt-3 grid gap-3 border-t border-slate-100 pt-3 lg:grid-cols-[1fr_220px_auto_auto]"
    >
      <input type="hidden" name="companyId" value={companyId ?? ""} />
      <input type="hidden" name="contactId" value={contactId ?? ""} />
      <input type="hidden" name="opportunityId" value={opportunityId ?? ""} />
      <input type="hidden" name="serviceId" value={serviceId ?? ""} />
      <input type="hidden" name="minutes" value={minutes ?? ""} />
      <input
        className="h-10 rounded-md border border-slate-300 px-3 text-sm"
        name="nextAction"
        onChange={(event) => setNextAction(event.target.value)}
        placeholder="Proxima accion opcional"
        value={nextAction}
      />
      <input
        className="h-10 rounded-md border border-slate-300 px-3 text-sm"
        name="nextActionDate"
        onChange={(event) => setNextActionDate(event.target.value)}
        type="datetime-local"
        value={nextActionDate}
      />
      <SubmitButton pendingLabel="Importando">Crear interaccion</SubmitButton>
      <Button formAction={ignoreAction} type="submit" variant="outline">
        Descartar
      </Button>
    </form>
  );
}