import { EmailDraftStatus, EmailDirection, UserRole } from "@prisma/client";
import { Bot, ChevronLeft, Mail } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { EmailDraftEditor } from "@/components/email/draft-editor";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  approveEmailDraft,
  discardEmailDraft,
  generateEmailDraft,
  saveEmailDraft,
} from "@/server/actions/email";
import { isActiveProviderConfigured } from "@/server/services/ai-provider";

export const dynamic = "force-dynamic";

export default async function EmailMessagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const message = await prisma.emailMessage.findFirst({
    where: {
      id: (await params).id,
      connection: { userId: session?.user.id },
    },
    include: { classification: true, draft: true, connection: true },
  });
  if (!message) notFound();

  const canEdit = session?.user.role !== UserRole.LECTURA;
  const canGenerate =
    canEdit &&
    message.direction === EmailDirection.INBOUND &&
    Boolean(message.classification?.isCommercial) &&
    (await isActiveProviderConfigured());

  return (
    <div className="space-y-5">
      <Button asChild size="sm" variant="ghost">
        <Link href="/email">
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Volver a correo
        </Link>
      </Button>

      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <Mail className="h-4 w-4" aria-hidden />
              {message.connection.emailAddress}
            </p>
            <h1 className="mt-2 text-xl font-semibold">
              {message.subject ?? "Sin asunto"}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              De {message.fromName ?? message.fromAddress} ·{" "}
              {formatDateTime(message.sentAt)}
            </p>
          </div>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
            {message.direction === EmailDirection.INBOUND
              ? "Recibido"
              : "Enviado"}
          </span>
        </div>
        <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {message.snippet ?? "El proveedor no entrego un extracto."}
        </p>
      </section>

      {message.classification ? (
        <section className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Contexto comercial</h2>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            {message.classification.summary}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {message.classification.intent} ·{" "}
            {Math.round(Number(message.classification.confidence) * 100)}%
          </p>
        </section>
      ) : null}

      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Borrador de respuesta</h2>
            <p className="mt-1 text-xs text-slate-500">
              La aprobacion solo marca el texto como listo. No envia correo.
            </p>
          </div>
          {message.draft ? (
            <span
              className={`rounded-md px-2 py-1 text-xs font-semibold ${
                message.draft.status === EmailDraftStatus.APPROVED
                  ? "bg-emerald-50 text-emerald-700"
                  : message.draft.status === EmailDraftStatus.DISCARDED
                    ? "bg-slate-100 text-slate-500"
                    : "bg-amber-50 text-amber-700"
              }`}
            >
              {message.draft.status}
            </span>
          ) : null}
        </div>

        {message.draft &&
        message.draft.status !== EmailDraftStatus.DISCARDED ? (
          <div className="mt-5">
            <EmailDraftEditor
              approveAction={approveEmailDraft}
              discardAction={discardEmailDraft.bind(null, message.draft.id)}
              draft={{
                id: message.draft.id,
                subject: message.draft.subject,
                body: message.draft.body,
                status: message.draft.status,
              }}
              saveAction={saveEmailDraft}
            />
          </div>
        ) : canGenerate ? (
          <form action={generateEmailDraft.bind(null, message.id)} className="mt-5">
            <SubmitButton pendingLabel="Generando borrador">
              <Bot className="h-4 w-4" aria-hidden />
              {message.draft ? "Regenerar borrador" : "Generar borrador con IA"}
            </SubmitButton>
          </form>
        ) : (
          <p className="mt-5 text-sm text-slate-500">
            Disponible para correos recibidos, clasificados como comerciales y
            con un proveedor de IA configurado.
          </p>
        )}
      </section>
    </div>
  );
}
