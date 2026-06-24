import { ContactStatus } from "@prisma/client";
import Link from "next/link";

import { auth } from "@/auth";
import { CompletenessIndicator } from "@/components/crm/completeness-indicator";
import { EntityHeader } from "@/components/crm/entity-header";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const q = params?.q?.trim();
  const status = params?.status as ContactStatus | undefined;
  const contacts = await prisma.contact.findMany({
    where: {
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { roleArea: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(status ? { status } : {}),
    },
    include: { company: true, responsible: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-5">
      <EntityHeader
        actionHref={session?.user.role === "LECTURA" ? undefined : "/contacts/new"}
        actionLabel={session?.user.role === "LECTURA" ? undefined : "Nuevo contacto"}
        description="Gestiona personas, origen lead, datos de contacto y relacion con empresas."
        title="Contactos"
      />
      <form className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-[1fr_220px_auto]">
        <input className="h-10 rounded-md border border-slate-300 px-3 text-sm" defaultValue={q} name="q" placeholder="Buscar contacto, email o cargo" />
        <select className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm" defaultValue={status ?? ""} name="status">
          <option value="">Todos los estados</option>
          {Object.values(ContactStatus).map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
        <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white">Filtrar</button>
      </form>
      <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Contacto</th>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Completitud</th>
              <th className="px-4 py-3">Ultima interaccion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contacts.map((contact) => (
              <tr key={contact.id}>
                <td className="px-4 py-3 font-medium"><Link className="hover:underline" href={`/contacts/${contact.id}`}>{contact.name}</Link></td>
                <td className="px-4 py-3">{contact.company?.name ?? "-"}</td>
                <td className="px-4 py-3">{contact.status}</td>
                <td className="px-4 py-3">{contact.email ?? "-"}</td>
                <td className="px-4 py-3"><CompletenessIndicator score={contact.completeness} /></td>
                <td className="px-4 py-3">{formatDate(contact.lastInteraction)}</td>
              </tr>
            ))}
            {contacts.length === 0 ? (
              <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={6}>No hay contactos para los filtros seleccionados.</td></tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
