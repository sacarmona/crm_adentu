import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { deleteContact } from "@/server/actions/crm";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contact = await prisma.contact.findFirst({
    where: { id, deletedAt: null },
    include: {
      company: true,
      responsible: true,
      primaryOpportunities: { where: { deletedAt: null }, include: { service: true }, take: 10 },
      interactions: { where: { deletedAt: null }, orderBy: { date: "desc" }, take: 10 },
    },
  });

  if (!contact) notFound();

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Contacto</p>
            <h1 className="mt-1 text-2xl font-semibold">{contact.name}</h1>
            <p className="mt-2 text-sm text-slate-600">{contact.company?.name ?? "Sin empresa"} · {contact.status}</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link href={`/contacts/${contact.id}/edit`}>Editar</Link></Button>
            <form action={deleteContact.bind(null, contact.id)}><Button type="submit" variant="secondary">Eliminar</Button></form>
          </div>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Email</p><p className="mt-2 text-sm font-medium">{contact.email ?? "-"}</p></div>
        <div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Telefono</p><p className="mt-2 text-sm font-medium">{contact.phone ?? "-"}</p></div>
        <div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Completitud</p><p className="mt-2 text-sm font-medium">{contact.completeness}%</p></div>
      </section>
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Oportunidades asociadas</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {contact.primaryOpportunities.map((opportunity) => (
            <li key={opportunity.id}>
              <Link className="font-medium hover:underline" href={`/opportunities/${opportunity.id}`}>{opportunity.name}</Link>
              <span className="text-slate-500"> · {opportunity.status} · {opportunity.service?.name ?? "sin servicio"}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Interacciones</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {contact.interactions.map((interaction) => (
            <li key={interaction.id}><span className="font-medium">{formatDate(interaction.date)}</span><span className="text-slate-600"> · {interaction.type} · {interaction.content}</span></li>
          ))}
        </ul>
      </section>
    </div>
  );
}
