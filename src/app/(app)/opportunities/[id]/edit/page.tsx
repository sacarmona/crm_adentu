import { notFound } from "next/navigation";

import { EntityHeader } from "@/components/crm/entity-header";
import { OpportunityForm } from "@/components/crm/forms";
import { prisma } from "@/lib/prisma";
import { updateOpportunity } from "@/server/actions/crm";

export const dynamic = "force-dynamic";

export default async function EditOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [opportunity, companies, contacts, services, users] = await Promise.all([
    prisma.opportunity.findFirst({ where: { id, deletedAt: null } }),
    prisma.company.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
    prisma.contact.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
    prisma.service.findMany({ where: { deletedAt: null, isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.user.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
  ]);

  if (!opportunity) notFound();

  return (
    <div className="space-y-5">
      <EntityHeader description="Actualiza etapa, montos, probabilidad, fechas y relaciones comerciales." title={`Editar ${opportunity.name}`} />
      <OpportunityForm action={updateOpportunity.bind(null, opportunity.id)} companies={companies} contacts={contacts} opportunity={opportunity} services={services} users={users} />
    </div>
  );
}
