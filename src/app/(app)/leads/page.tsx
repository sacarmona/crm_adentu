import { LeadStatus, Prisma, UserRole } from "@prisma/client";
import Link from "next/link";

import { auth } from "@/auth";
import { InlineSelectForm } from "@/components/crm/inline-select-form";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { contactMediumLabels, leadStatusLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { updateLeadStatus } from "@/server/actions/leads";

export const dynamic = "force-dynamic";

const statusStyles: Record<LeadStatus, string> = {
  NUEVO: "bg-sky-50 text-sky-700",
  SIN_RESPUESTA: "bg-orange-50 text-orange-700",
  CONTACTADO: "bg-amber-50 text-amber-700",
  CALIFICADO: "bg-violet-50 text-violet-700",
  CONVERTIDO: "bg-emerald-50 text-emerald-700",
  DESCARTADO: "bg-slate-100 text-slate-500",
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string; responsibleId?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const canEdit = session?.user.role !== UserRole.LECTURA;
  const q = params?.q?.trim();
  const statusValue = params?.status as LeadStatus | undefined;
  const responsibleId = params?.responsibleId;

  const conditions: Prisma.LeadWhereInput[] = [{ deletedAt: null }];
  if (q) {
    conditions.push({
      OR: [
        { contactName: { contains: q, mode: "insensitive" } },
        { companyName: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (statusValue) conditions.push({ status: statusValue });
  if (responsibleId) conditions.push({ responsibleId });

  const [leads, users] = await Promise.all([
    prisma.lead.findMany({
      where: { AND: conditions },
      orderBy: [{ lastContactAt: "desc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const userNames = new Map(users.map((user) => [user.id, user.name]));

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Leads</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Registro de leads previo a convertirlos en oportunidades. Mantiene el historial de contactos.
            </p>
          </div>
          {canEdit ? (
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/leads/import">Importar</Link>
              </Button>
              <Button asChild>
                <Link href="/leads/new">Nuevo lead</Link>
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      <form className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-[1fr_180px_180px_auto]">
        <input
          className="h-10 rounded-md border border-slate-300 px-3 text-sm"
          defaultValue={q}
          name="q"
          placeholder="Buscar contacto o empresa"
        />
        <select
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
          defaultValue={statusValue ?? ""}
          name="status"
        >
          <option value="">Todos los estados</option>
          {Object.values(LeadStatus).map((value) => (
            <option key={value} value={value}>
              {leadStatusLabels[value]}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
          defaultValue={responsibleId ?? ""}
          name="responsibleId"
        >
          <option value="">Todos los responsables</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
        <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white">
          Filtrar
        </button>
      </form>

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <table className="w-full min-w-[900px] table-fixed text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Contacto</th>
              <th className="px-4 py-3">Empresa</th>
              <th className="w-28 px-4 py-3">Medio</th>
              <th className="w-32 px-4 py-3">Ultimo contacto</th>
              <th className="w-40 px-4 py-3">Estado</th>
              <th className="w-40 px-4 py-3">Responsable</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td className="truncate px-4 py-3 font-medium">
                  <Link className="hover:underline" href={`/leads/${lead.id}`}>
                    {lead.contactName}
                  </Link>
                </td>
                <td className="truncate px-4 py-3">{lead.companyName ?? "-"}</td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {contactMediumLabels[lead.medium]}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {lead.lastContactAt ? formatDate(lead.lastContactAt) : "-"}
                </td>
                <td className="px-4 py-3">
                  {canEdit ? (
                    <InlineSelectForm
                      action={updateLeadStatus.bind(null, lead.id)}
                      defaultValue={lead.status}
                      includeBlankOption={false}
                      name="status"
                      options={Object.values(LeadStatus).map((value) => ({
                        value,
                        label: leadStatusLabels[value],
                      }))}
                    />
                  ) : (
                    <span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusStyles[lead.status]}`}>
                      {leadStatusLabels[lead.status]}
                    </span>
                  )}
                </td>
                <td className="truncate px-4 py-3 text-xs text-slate-600">
                  {lead.responsibleId ? userNames.get(lead.responsibleId) ?? "-" : "-"}
                </td>
              </tr>
            ))}
            {leads.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                  No hay leads para los filtros seleccionados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
