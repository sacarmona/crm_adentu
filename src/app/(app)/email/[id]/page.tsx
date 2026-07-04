import {
  EmailClassificationStatus,
  EmailDiscardRuleType,
  EmailDraftStatus,
  EmailDirection,
  OpportunityStatus,
  UserRole,
} from "@prisma/client";
import { Bot, Check, EyeOff, ListFilter, Mail } from "lucide-react";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { EmailDraftEditor } from "@/components/email/draft-editor";
import { EmailResolutionFields } from "@/components/email/email-resolution-fields";
import { ExpandableBody } from "@/components/email/expandable-body";
import { BackLink } from "@/components/ui/back-link";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime } from "@/lib/format";
import { emailCommercialIntentLabels, emailDraftStatusLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import {
  approveEmailClassification,
  approveEmailDraft,
  createDiscardRuleFromMessage,
  discardEmailMessage,
  discardEmailDraft,
  generateEmailDraft,
  ignoreEmailClassification,
  restoreDiscardedEmail,
  retryPushEmailDraft,
  saveEmailDraft,
} from "@/server/actions/email";
import { isActiveProviderConfigured } from "@/server/services/ai-provider";
import { findCompanyCandidates } from "@/server/services/email-agent";

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
    include: {
      classification: { include: { discardRule: true } },
      draft: true,
      connection: true,
    },
  });
  if (!message) notFound();

  const canEdit = session?.user.role !== UserRole.LECTURA;
  const canGenerate =
    canEdit &&
    message.direction === EmailDirection.INBOUND &&
    Boolean(message.classification?.isCommercial) &&
    (await isActiveProviderConfigured());

  const classification = message.classification;
  const needsResolution =
    canEdit &&
    classification?.status === EmailClassificationStatus.PROPOSED &&
    classification.isCommercial &&
    (!classification.matchedCompanyId ||
      !classification.matchedContactId ||
      !classification.matchedOpportunityId);

  type NameOption = { id: string; name: string };
  type ScopedOption = NameOption & { companyId: string | null };
  let companyCandidates: NameOption[] = [];
  let companies: NameOption[] = [];
  let contacts: ScopedOption[] = [];
  let opportunities: ScopedOption[] = [];
  let services: NameOption[] = [];

  if (needsResolution) {
    [companyCandidates, companies, contacts, opportunities, services] =
      await Promise.all([
        findCompanyCandidates(message.fromAddress),
        prisma.company.findMany({
          where: { deletedAt: null },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
        classification?.matchedCompanyId
          ? prisma.contact.findMany({
              where: {
                deletedAt: null,
                companyId: classification.matchedCompanyId,
              },
              orderBy: { name: "asc" },
              select: { id: true, name: true, companyId: true },
            })
          : prisma.contact.findMany({
              where: { deletedAt: null },
              orderBy: { name: "asc" },
              select: { id: true, name: true, companyId: true },
            }),
        prisma.opportunity.findMany({
          where: {
            deletedAt: null,
            status: {
              notIn: [OpportunityStatus.WON, OpportunityStatus.LOST],
            },
            ...(classification?.matchedCompanyId
              ? { companyId: classification.matchedCompanyId }
              : {}),
          },
          orderBy: { updatedAt: "desc" },
          select: { id: true, name: true, companyId: true },
        }),
        prisma.service.findMany({
          where: { deletedAt: null, isActive: true },
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true },
        }),
      ]);
  }

  return (
    <div className="space-y-5">
      <BackLink fallbackHref="/email" label="Volver a correo" />

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
        <div className="mt-5">
          <ExpandableBody
            text={message.body ?? message.snippet ?? "El proveedor no entrego contenido."}
          />
        </div>
        {!message.body && message.snippet ? (
          <p className="mt-3 text-xs text-slate-500">
            Solo se sincronizo un extracto corto de este mensaje. Sincroniza el
            buzon nuevamente para intentar recuperar el contenido completo.
          </p>
        ) : null}
      </section>

      {canEdit ? (
        <section className="rounded-md border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <ListFilter className="h-5 w-5 text-teal-700" aria-hidden />
            <h2 className="font-semibold">Descarte y aprendizaje</h2>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Las reglas se aplican antes de la IA y reducen analisis innecesarios.
          </p>
          {message.classification?.status ===
          EmailClassificationStatus.IGNORED ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-sm text-slate-600">
                {message.classification.discardRule
                  ? `Descartado por regla: ${message.classification.discardRule.value}`
                  : "Descartado manualmente"}
              </span>
              <form action={restoreDiscardedEmail.bind(null, message.id)}>
                <SubmitButton pendingLabel="Restaurando" size="sm">
                  Restaurar correo
                </SubmitButton>
              </form>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              <form action={discardEmailMessage.bind(null, message.id)}>
                <SubmitButton
                  pendingLabel="Descartando"
                  size="sm"
                  variant="outline"
                >
                  <EyeOff className="h-4 w-4" aria-hidden />
                  Descartar solo este
                </SubmitButton>
              </form>
              {[
                [EmailDiscardRuleType.SENDER_EXACT, "Regla por remitente"],
                [EmailDiscardRuleType.SENDER_DOMAIN, "Regla por dominio"],
                [EmailDiscardRuleType.SUBJECT_CONTAINS, "Regla por asunto"],
              ].map(([type, label]) => (
                <form action={createDiscardRuleFromMessage} key={type}>
                  <input name="messageId" type="hidden" value={message.id} />
                  <input name="type" type="hidden" value={type} />
                  <SubmitButton
                    pendingLabel="Creando regla"
                    size="sm"
                    variant="ghost"
                  >
                    {label}
                  </SubmitButton>
                </form>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {message.classification ? (
        <section className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Contexto comercial</h2>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            {message.classification.summary}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {emailCommercialIntentLabels[message.classification.intent]} ·{" "}
            {Math.round(Number(message.classification.confidence) * 100)}%
          </p>
        </section>
      ) : null}

      {canEdit &&
      classification?.status === EmailClassificationStatus.PROPOSED &&
      classification.isCommercial ? (
        <section className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Asociar a CRM y aprobar</h2>
          {needsResolution ? (
            <p className="mt-2 text-sm text-slate-600">
              La IA no encontro coincidencia para algunos campos. Selecciona
              una existente o crea una nueva antes de aprobar.
            </p>
          ) : null}
          <form
            action={approveEmailClassification.bind(null, classification.id)}
            className="mt-4 space-y-5"
          >
            <EmailResolutionFields
              companies={companies}
              contacts={contacts}
              defaultContactEmail={message.fromAddress}
              defaultContactName={message.fromName ?? ""}
              opportunities={opportunities}
              services={services}
              showCompany={!classification.matchedCompanyId}
              showContact={!classification.matchedContactId}
              showOpportunity={!classification.matchedOpportunityId}
              suggestedCompanyIds={companyCandidates.map((candidate) => candidate.id)}
            />

            <SubmitButton pendingLabel="Aprobando">
              <Check className="h-4 w-4" aria-hidden />
              Aprobar y crear interaccion
            </SubmitButton>
          </form>
          <form
            action={ignoreEmailClassification.bind(null, classification.id)}
            className="mt-3"
          >
            <SubmitButton pendingLabel="Ignorando" variant="ghost">
              <EyeOff className="h-4 w-4" aria-hidden />
              Ignorar correo
            </SubmitButton>
          </form>
        </section>
      ) : null}

      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Borrador de respuesta</h2>
            <p className="mt-1 text-xs text-slate-500">
              Al aprobar, si tu cuenta es Gmail, guardamos el borrador en tu
              buzon real. No se envia el correo automaticamente.
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
              {emailDraftStatusLabels[message.draft.status]}
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
                providerDraftId: message.draft.providerDraftId,
                pushedAt: message.draft.pushedAt,
                pushError: message.draft.pushError,
              }}
              retryPushAction={retryPushEmailDraft.bind(null, message.draft.id)}
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
