import {
  OpportunityStatus,
  UserRole,
  WhatsAppDirection,
  WhatsAppMessageStatus,
} from "@prisma/client";
import { Bot, Check, EyeOff, ListFilter, MessageCircle, ShieldOff } from "lucide-react";
import Link from "next/link";

import { auth } from "@/auth";
import { EntityHeader } from "@/components/crm/entity-header";
import { EmailResolutionFields } from "@/components/email/email-resolution-fields";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { WhatsAppComposer } from "@/components/whatsapp/composer";
import { formatDateTime } from "@/lib/format";
import { commercialSentimentLabels, emailCommercialIntentLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import {
  analyzeWhatsAppConversation,
  approveWhatsAppMessage,
  confirmWhatsAppTask,
  discardWhatsAppNumber,
  ignoreWhatsAppMessage,
  sendWhatsAppReply,
} from "@/server/actions/whatsapp";
import { isActiveProviderConfigured } from "@/server/services/ai-provider";
import { isWhatsAppConfigured } from "@/server/services/whatsapp-client";

export const dynamic = "force-dynamic";

type WhatsAppMessageRow = Awaited<
  ReturnType<typeof prisma.whatsAppMessage.findMany>
>[number];

function threadKey(message: WhatsAppMessageRow) {
  return message.direction === WhatsAppDirection.INBOUND
    ? message.fromNumber
    : message.toNumber;
}

function groupIntoThreads(messages: WhatsAppMessageRow[]) {
  const groups = new Map<string, WhatsAppMessageRow[]>();
  for (const message of messages) {
    const key = threadKey(message);
    const group = groups.get(key) ?? [];
    group.push(message);
    groups.set(key, group);
  }

  return [...groups.entries()]
    .map(([phone, groupMessages]) => {
      const sorted = [...groupMessages].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
      );
      const contactName = sorted.findLast((message) => message.contactName)?.contactName ?? null;
      const matchedCompanyId = sorted.findLast((message) => message.matchedCompanyId)?.matchedCompanyId ?? null;
      const matchedContactId = sorted.findLast((message) => message.matchedContactId)?.matchedContactId ?? null;
      const matchedOpportunityId =
        sorted.findLast((message) => message.matchedOpportunityId)?.matchedOpportunityId ?? null;
      const pendingCount = sorted.filter(
        (message) => message.status === WhatsAppMessageStatus.PENDING,
      ).length;
      const lastMessageAt = sorted[sorted.length - 1].timestamp;

      return {
        phone,
        contactName,
        matchedCompanyId,
        matchedContactId,
        matchedOpportunityId,
        pendingCount,
        lastMessageAt,
        messages: sorted,
      };
    })
    .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
}

export default async function WhatsAppPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const session = await auth();
  const canEdit = session?.user.role !== UserRole.LECTURA;
  const canAnalyze = canEdit && (await isActiveProviderConfigured());
  const configured = isWhatsAppConfigured();
  const params = await searchParams;
  const query = params?.q?.trim().toLowerCase() ?? "";

  const messages = configured
    ? await prisma.whatsAppMessage.findMany({
        orderBy: { timestamp: "desc" },
        take: 200,
      })
    : [];

  const allThreads = groupIntoThreads(messages);
  const pendingMessages = messages.filter(
    (message) => message.status === WhatsAppMessageStatus.PENDING,
  );

  const threadAnalyses = allThreads.length
    ? await prisma.whatsAppThreadAnalysis.findMany({
        where: { phoneNumber: { in: allThreads.map((thread) => thread.phone) } },
      })
    : [];
  const analysisByPhone = new Map(threadAnalyses.map((analysis) => [analysis.phoneNumber, analysis]));

  const [companies, contacts, opportunities, services] = canEdit
    ? await Promise.all([
        prisma.company.findMany({
          where: { deletedAt: null },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
        prisma.contact.findMany({
          where: { deletedAt: null },
          orderBy: { name: "asc" },
          select: { id: true, name: true, companyId: true, phone: true },
        }),
        prisma.opportunity.findMany({
          where: { deletedAt: null, status: { notIn: [OpportunityStatus.WON, OpportunityStatus.LOST] } },
          orderBy: { updatedAt: "desc" },
          select: { id: true, name: true, companyId: true },
        }),
        prisma.service.findMany({
          where: { deletedAt: null, isActive: true },
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true },
        }),
      ])
    : [[], [], [], []];

  const matchedIds = [
    ...new Set(
      allThreads.flatMap((thread) =>
        [thread.matchedContactId, thread.matchedCompanyId, thread.matchedOpportunityId].filter(
          (id): id is string => Boolean(id),
        ),
      ),
    ),
  ];
  const [matchedContacts, matchedCompanies, matchedOpportunities] = await Promise.all([
    prisma.contact.findMany({ where: { id: { in: matchedIds } }, select: { id: true, name: true } }),
    prisma.company.findMany({ where: { id: { in: matchedIds } }, select: { id: true, name: true } }),
    prisma.opportunity.findMany({ where: { id: { in: matchedIds } }, select: { id: true, name: true } }),
  ]);
  const contactNames = new Map(matchedContacts.map((item) => [item.id, item.name]));
  const companyNames = new Map(matchedCompanies.map((item) => [item.id, item.name]));
  const opportunityNames = new Map(matchedOpportunities.map((item) => [item.id, item.name]));

  const threads = query
    ? allThreads.filter((thread) => {
        const contactName =
          (thread.matchedContactId && contactNames.get(thread.matchedContactId)) ||
          thread.contactName ||
          "";
        return (
          contactName.toLowerCase().includes(query) || thread.phone.toLowerCase().includes(query)
        );
      })
    : allThreads;

  return (
    <div className="space-y-5">
      <EntityHeader
        description="Mensajes de WhatsApp Business sincronizados via webhook y vinculados al historial comercial."
        title="WhatsApp"
      />

      {!configured ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          WhatsApp Business Cloud API no esta configurado. Define
          WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID y
          WHATSAPP_VERIFY_TOKEN, y registra el webhook en Meta apuntando a
          /api/whatsapp/webhook.
        </div>
      ) : null}

      {canEdit && configured ? (
        <details className="group rounded-md border border-slate-200 bg-white p-5">
          <summary className="cursor-pointer font-semibold">Enviar mensaje</summary>
          <WhatsAppComposer
            action={sendWhatsAppReply}
            companies={companies}
            contacts={contacts}
            opportunities={opportunities}
          />
        </details>
      ) : null}

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="font-semibold">Conversaciones</h2>
            <p className="mt-1 text-xs text-slate-500">
              {pendingMessages.length} mensajes pendientes de vincular a una empresa, contacto u oportunidad.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <form className="flex items-center gap-2" method="get">
              <input
                className="h-9 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-950"
                defaultValue={params?.q ?? ""}
                name="q"
                placeholder="Buscar por contacto o numero"
                type="search"
              />
              <Button size="sm" type="submit" variant="outline">
                Buscar
              </Button>
            </form>
            {canEdit ? (
              <Button asChild size="sm" variant="outline">
                <Link href="/whatsapp/rules">
                  <ListFilter className="h-4 w-4" aria-hidden />
                  Numeros descartados
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {threads.map((thread) => (
            <article className="p-4" key={thread.phone}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="flex items-center gap-2 font-medium">
                  <MessageCircle className="h-4 w-4 text-emerald-700" aria-hidden />
                  {thread.contactName ?? thread.phone}
                  <span className="text-xs font-normal text-slate-500">{thread.phone}</span>
                </p>
                <div className="flex items-center gap-2">
                  {thread.pendingCount > 0 ? (
                    <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                      {thread.pendingCount} {thread.pendingCount === 1 ? "pendiente" : "pendientes"}
                    </span>
                  ) : null}
                  {canAnalyze ? (
                    <form action={analyzeWhatsAppConversation.bind(null, thread.phone)}>
                      <SubmitButton pendingLabel="Analizando" size="sm" variant="outline">
                        <Bot className="h-4 w-4" aria-hidden />
                        Analizar con IA
                      </SubmitButton>
                    </form>
                  ) : null}
                </div>
              </div>

              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-medium text-emerald-700">
                  Ver conversación ({thread.messages.length}{" "}
                  {thread.messages.length === 1 ? "mensaje" : "mensajes"})
                </summary>

              {(() => {
                const analysis = analysisByPhone.get(thread.phone);
                if (!analysis) return null;
                return (
                  <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`rounded-md px-2 py-1 font-semibold ${
                          analysis.isCommercial
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {analysis.isCommercial ? "Comercial" : "No comercial"}
                      </span>
                      <span className="text-slate-500">
                        {emailCommercialIntentLabels[analysis.intent]} ·{" "}
                        {commercialSentimentLabels[analysis.sentiment]} ·{" "}
                        {Math.round(Number(analysis.confidence) * 100)}%
                      </span>
                    </div>
                    <p className="mt-2 text-slate-700">{analysis.summary}</p>
                    {analysis.suggestedNextAction ? (
                      <div className="mt-3 border-t border-slate-200 pt-3">
                        <p className="text-xs text-slate-500">
                          Proxima accion sugerida
                          {analysis.suggestedDueDate
                            ? ` · ${formatDateTime(analysis.suggestedDueDate)}`
                            : ""}
                        </p>
                        <p className="mt-1 font-medium text-slate-800">
                          {analysis.suggestedNextAction}
                        </p>
                        {analysis.taskCreatedId ? (
                          <p className="mt-2 text-xs font-medium text-emerald-700">
                            Tarea creada. <Link className="underline" href="/tasks">Ver tareas</Link>
                          </p>
                        ) : canEdit ? (
                          <form action={confirmWhatsAppTask.bind(null, thread.phone)} className="mt-2">
                            <SubmitButton pendingLabel="Creando" size="sm">
                              <Check className="h-4 w-4" aria-hidden />
                              Confirmar y crear tarea
                            </SubmitButton>
                          </form>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })()}

              {thread.matchedCompanyId || thread.matchedContactId || thread.matchedOpportunityId ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium text-slate-500">
                    Vinculado a CRM
                  </summary>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    {thread.matchedCompanyId ? (
                      <Link className="font-medium hover:underline" href={`/companies/${thread.matchedCompanyId}`}>
                        {companyNames.get(thread.matchedCompanyId) ?? "Empresa"}
                      </Link>
                    ) : null}
                    {thread.matchedContactId ? (
                      <Link className="font-medium hover:underline" href={`/contacts/${thread.matchedContactId}`}>
                        {contactNames.get(thread.matchedContactId) ?? "Contacto"}
                      </Link>
                    ) : null}
                    {thread.matchedOpportunityId ? (
                      <Link
                        className="font-medium hover:underline"
                        href={`/opportunities/${thread.matchedOpportunityId}`}
                      >
                        {opportunityNames.get(thread.matchedOpportunityId) ?? "Oportunidad"}
                      </Link>
                    ) : null}
                  </div>
                </details>
              ) : null}

              <div className="mt-3 space-y-2">
                {thread.messages.map((message) => {
                  const isOutbound = message.direction === WhatsAppDirection.OUTBOUND;
                  return (
                    <div
                      className={`flex flex-col ${isOutbound ? "items-end" : "items-start"}`}
                      key={message.id}
                    >
                      <div
                        className={`max-w-md rounded-md px-3 py-2 text-sm leading-6 ${
                          isOutbound
                            ? "bg-emerald-50 text-emerald-900"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">
                          {message.body ?? "Mensaje sin contenido de texto."}
                        </p>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {formatDateTime(message.timestamp)}
                        {message.status === WhatsAppMessageStatus.IGNORED ? " · Ignorado" : ""}
                      </p>
                      {canEdit && message.status === WhatsAppMessageStatus.PENDING ? (
                        <details className="mt-1 w-full max-w-md">
                          <summary className="cursor-pointer text-xs font-medium text-emerald-700">
                            Vincular este mensaje
                          </summary>
                          <div className="mt-2 space-y-3 rounded-md border border-slate-200 p-3">
                            <form
                              action={approveWhatsAppMessage.bind(null, message.id)}
                              className="space-y-3"
                            >
                              <EmailResolutionFields
                                companies={companies}
                                contacts={contacts}
                                defaultContactEmail=""
                                defaultContactName={message.contactName ?? ""}
                                opportunities={opportunities}
                                services={services}
                                showCompany={!message.matchedCompanyId}
                                showContact={!message.matchedContactId}
                                showContactEmailField={false}
                                showOpportunity={!message.matchedOpportunityId}
                                suggestedCompanyIds={[]}
                              />
                              <SubmitButton pendingLabel="Vinculando" size="sm">
                                <Check className="h-4 w-4" aria-hidden />
                                Vincular y aprobar
                              </SubmitButton>
                            </form>
                            <div className="flex flex-wrap gap-2">
                              <form action={ignoreWhatsAppMessage.bind(null, message.id)}>
                                <SubmitButton pendingLabel="Ignorando" size="sm" variant="ghost">
                                  <EyeOff className="h-4 w-4" aria-hidden />
                                  Ignorar
                                </SubmitButton>
                              </form>
                              <form action={discardWhatsAppNumber.bind(null, message.fromNumber)}>
                                <SubmitButton pendingLabel="Descartando" size="sm" variant="ghost">
                                  <ShieldOff className="h-4 w-4" aria-hidden />
                                  Descartar numero (no comercial)
                                </SubmitButton>
                              </form>
                            </div>
                          </div>
                        </details>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {canEdit && configured ? (
                <form
                  action={sendWhatsAppReply}
                  className="mt-3 flex items-end gap-2 border-t border-slate-100 pt-3"
                >
                  <input name="to" type="hidden" value={thread.phone} />
                  <input
                    name="companyId"
                    type="hidden"
                    value={thread.matchedCompanyId ?? ""}
                  />
                  <input
                    name="contactId"
                    type="hidden"
                    value={thread.matchedContactId ?? ""}
                  />
                  <input
                    name="opportunityId"
                    type="hidden"
                    value={thread.matchedOpportunityId ?? ""}
                  />
                  <textarea
                    className="min-h-10 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-950"
                    name="body"
                    placeholder="Responder en esta conversacion..."
                    required
                    rows={1}
                  />
                  <SubmitButton pendingLabel="Enviando" size="sm">
                    Responder
                  </SubmitButton>
                </form>
              ) : null}
              </details>
            </article>
          ))}
          {threads.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">
              {query
                ? "Ninguna conversacion coincide con la busqueda."
                : configured
                  ? "Todavia no hay mensajes de WhatsApp."
                  : "Configura WhatsApp para recibir mensajes."}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
