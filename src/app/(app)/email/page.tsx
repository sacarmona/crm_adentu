import { EmailDirection, EmailProvider, UserRole } from "@prisma/client";
import { CheckCircle2, Mail, RefreshCw, Unplug } from "lucide-react";

import { auth } from "@/auth";
import { EntityHeader } from "@/components/crm/entity-header";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  disconnectEmailConnection,
  syncEmailConnection,
} from "@/server/actions/email";
import { isEmailProviderConfigured } from "@/server/services/email-providers";

export const dynamic = "force-dynamic";

const providerDetails = {
  [EmailProvider.GMAIL]: {
    label: "Google Gmail",
    slug: "gmail",
    description: "Lee mensajes autorizados mediante Gmail API.",
  },
  [EmailProvider.MICROSOFT]: {
    label: "Microsoft 365",
    slug: "microsoft",
    description: "Lee Outlook mediante Microsoft Graph.",
  },
};

export default async function EmailPage({
  searchParams,
}: {
  searchParams?: Promise<{ connected?: string; error?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const userId = session?.user.id;
  const canEdit = session?.user.role !== UserRole.LECTURA;
  const connections = userId
    ? await prisma.emailConnection.findMany({
        where: { userId },
        include: { _count: { select: { messages: true } } },
        orderBy: { createdAt: "asc" },
      })
    : [];
  const messages =
    connections.length > 0
      ? await prisma.emailMessage.findMany({
          where: { connectionId: { in: connections.map(({ id }) => id) } },
          include: { connection: true },
          orderBy: { sentAt: "desc" },
          take: 100,
        })
      : [];

  return (
    <div className="space-y-5">
      <EntityHeader
        description="Conecta buzones autorizados y sincroniza mensajes para su posterior clasificacion comercial."
        title="Correo"
      />

      {params?.connected ? (
        <Notice tone="success">
          Buzon conectado. Ejecuta la primera sincronizacion para cargar mensajes.
        </Notice>
      ) : null}
      {params?.error ? (
        <Notice tone="error">
          No fue posible completar la conexion. Revisa credenciales OAuth y URL de retorno.
        </Notice>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        {Object.values(EmailProvider).map((provider) => {
          const details = providerDetails[provider];
          const connection = connections.find(
            (item) => item.provider === provider,
          );
          const configured = isEmailProviderConfigured(provider);

          return (
            <article
              className="rounded-md border border-slate-200 bg-white p-5"
              key={provider}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <Mail className="mt-0.5 h-5 w-5 text-teal-700" aria-hidden />
                  <div>
                    <h2 className="font-semibold">{details.label}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {details.description}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-md px-2 py-1 text-xs font-semibold ${
                    connection
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {connection ? "Conectado" : "Sin conectar"}
                </span>
              </div>

              {connection ? (
                <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm">
                  <p className="font-medium">{connection.emailAddress}</p>
                  <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
                    <div>
                      <p>Mensajes</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">
                        {connection._count.messages}
                      </p>
                    </div>
                    <div>
                      <p>Ultima sincronizacion</p>
                      <p className="mt-1 text-sm font-medium text-slate-950">
                        {connection.lastSyncedAt
                          ? formatDateTime(connection.lastSyncedAt)
                          : "Pendiente"}
                      </p>
                    </div>
                  </div>
                  {connection.lastError ? (
                    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {connection.lastError}
                    </p>
                  ) : null}
                  {canEdit ? (
                    <div className="flex flex-wrap gap-2">
                      <form action={syncEmailConnection.bind(null, connection.id)}>
                        <SubmitButton
                          pendingLabel="Sincronizando"
                          size="sm"
                        >
                          <RefreshCw className="h-4 w-4" aria-hidden />
                          Sincronizar
                        </SubmitButton>
                      </form>
                      <form
                        action={disconnectEmailConnection.bind(
                          null,
                          connection.id,
                        )}
                      >
                        <SubmitButton
                          pendingLabel="Desconectando"
                          size="sm"
                          variant="outline"
                        >
                          <Unplug className="h-4 w-4" aria-hidden />
                          Desconectar
                        </SubmitButton>
                      </form>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  {canEdit && configured ? (
                    <Button asChild>
                      <a href={`/api/email/oauth/${details.slug}/start`}>
                        Conectar {details.label}
                      </a>
                    </Button>
                  ) : (
                    <p className="text-sm text-slate-500">
                      {configured
                        ? "Tu rol permite consulta, pero no conectar buzones."
                        : "El administrador debe configurar las credenciales OAuth."}
                    </p>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">Mensajes sincronizados</h2>
          <p className="mt-1 text-xs text-slate-500">
            Metadatos y extractos preparados para la siguiente fase de clasificacion.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Direccion</th>
                <th className="px-4 py-3">Remitente</th>
                <th className="px-4 py-3">Asunto</th>
                <th className="px-4 py-3">Buzon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {messages.map((message) => (
                <tr key={message.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                    {formatDateTime(message.sentAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-semibold ${
                        message.direction === EmailDirection.INBOUND
                          ? "bg-sky-50 text-sky-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {message.direction === EmailDirection.INBOUND
                        ? "Recibido"
                        : "Enviado"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {message.fromName ?? message.fromAddress}
                    </p>
                    {message.fromName ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {message.fromAddress}
                      </p>
                    ) : null}
                  </td>
                  <td className="max-w-md px-4 py-3">
                    <p className="font-medium">{message.subject ?? "Sin asunto"}</p>
                    {message.snippet ? (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                        {message.snippet}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {message.connection.emailAddress}
                  </td>
                </tr>
              ))}
              {messages.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-10 text-center text-sm text-slate-500"
                    colSpan={5}
                  >
                    Conecta y sincroniza un buzon para comenzar.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Notice({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "success" | "error";
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md border px-4 py-3 text-sm ${
        tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {tone === "success" ? (
        <CheckCircle2 className="h-4 w-4" aria-hidden />
      ) : null}
      {children}
    </div>
  );
}
