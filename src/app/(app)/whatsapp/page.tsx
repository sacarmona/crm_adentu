import {
  OpportunityStatus,
  UserRole,
  WhatsAppDirection,
  WhatsAppMessageStatus,
} from "@prisma/client";
import { Check, EyeOff, MessageCircle, Send } from "lucide-react";
import Link from "next/link";

import { auth } from "@/auth";
import { EntityHeader } from "@/components/crm/entity-header";
import { SelectField, TextField } from "@/components/crm/form-controls";
import { EmailResolutionFields } from "@/components/email/email-resolution-fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  approveWhatsAppMessage,
  ignoreWhatsAppMessage,
  sendWhatsAppReply,
} from "@/server/actions/whatsapp";
import { isWhatsAppConfigured } from "@/server/services/whatsapp-client";

export const dynamic = "force-dynamic";

const statusLabels: Record<WhatsAppMessageStatus, string> = {
  PENDING: "Pendiente",
  LINKED: "Vinculado",
  IGNORED: "Ignorado",
};

const statusStyles: Record<WhatsAppMessageStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  LINKED: "bg-emerald-50 text-emerald-700",
  IGNORED: "bg-slate-100 text-slate-500",
};

export default async function WhatsAppPage() {
  const session = await auth();
  const canEdit = session?.user.role !== UserRole.LECTURA;
  const configured = isWhatsAppConfigured();

  const messages = configured
    ? await prisma.whatsAppMessage.findMany({
        orderBy: { timestamp: "desc" },
        take: 100,
      })
    : [];

  const pendingMessages = messages.filter(
    (message) => message.status === WhatsAppMessageStatus.PENDING,
  );

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
          select: { id: true, name: true, companyId: true },
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
      messages.flatMap((message) =>
        [message.matchedContactId, message.matchedCompanyId, message.matchedOpportunityId].filter(
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
        <section className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Enviar mensaje</h2>
          <form action={sendWhatsAppReply} className="mt-4 grid gap-3 md:grid-cols-2">
            <TextField label="Numero (con codigo de pais)" name="to" required />
            <SelectField
              label="Empresa (opcional)"
              name="companyId"
              options={companies.map((company) => ({ value: company.id, label: company.name }))}
              placeholder="Sin empresa"
            />
            <SelectField
              label="Contacto (opcional)"
              name="contactId"
              options={contacts.map((contact) => ({ value: contact.id, label: contact.name }))}
              placeholder="Sin contacto"
            />
            <SelectField
              label="Oportunidad (opcional)"
              name="opportunityId"
              options={opportunities.map((opportunity) => ({
                value: opportunity.id,
                label: opportunity.name,
              }))}
              placeholder="Sin oportunidad"
            />
            <div className="md:col-span-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Mensaje</span>
                <textarea
                  className="mt-2 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-950"
                  name="body"
                  required
                />
              </label>
            </div>
            <div>
              <SubmitButton pendingLabel="Enviando">
                <Send className="h-4 w-4" aria-hidden />
                Enviar
              </SubmitButton>
            </div>
          </form>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">Mensajes recientes</h2>
          <p className="mt-1 text-xs text-slate-500">
            {pendingMessages.length} pendientes de vincular a una empresa, contacto u oportunidad.
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {messages.map((message) => (
            <article className="p-4" key={message.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-medium">
                    <MessageCircle className="h-4 w-4 text-emerald-700" aria-hidden />
                    {message.direction === WhatsAppDirection.INBOUND
                      ? message.contactName ?? message.fromNumber
                      : `Para ${message.toNumber}`}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDateTime(message.timestamp)} ·{" "}
                    {message.direction === WhatsAppDirection.INBOUND ? "Recibido" : "Enviado"}
                  </p>
                </div>
                <span
                  className={`rounded-md px-2 py-1 text-xs font-semibold ${statusStyles[message.status]}`}
                >
                  {statusLabels[message.status]}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {message.body ?? "Mensaje sin contenido de texto."}
              </p>
              {message.status !== WhatsAppMessageStatus.PENDING ? (
                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  {message.matchedCompanyId ? (
                    <Link className="font-medium hover:underline" href={`/companies/${message.matchedCompanyId}`}>
                      {companyNames.get(message.matchedCompanyId) ?? "Empresa"}
                    </Link>
                  ) : null}
                  {message.matchedContactId ? (
                    <Link className="font-medium hover:underline" href={`/contacts/${message.matchedContactId}`}>
                      {contactNames.get(message.matchedContactId) ?? "Contacto"}
                    </Link>
                  ) : null}
                  {message.matchedOpportunityId ? (
                    <Link
                      className="font-medium hover:underline"
                      href={`/opportunities/${message.matchedOpportunityId}`}
                    >
                      {opportunityNames.get(message.matchedOpportunityId) ?? "Oportunidad"}
                    </Link>
                  ) : null}
                </div>
              ) : null}
              {canEdit && message.status === WhatsAppMessageStatus.PENDING ? (
                <div className="mt-4 space-y-4">
                  <form action={approveWhatsAppMessage.bind(null, message.id)} className="space-y-3">
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
                  <form action={ignoreWhatsAppMessage.bind(null, message.id)}>
                    <SubmitButton pendingLabel="Ignorando" size="sm" variant="ghost">
                      <EyeOff className="h-4 w-4" aria-hidden />
                      Ignorar
                    </SubmitButton>
                  </form>
                </div>
              ) : null}
            </article>
          ))}
          {messages.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">
              {configured ? "Todavia no hay mensajes de WhatsApp." : "Configura WhatsApp para recibir mensajes."}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
