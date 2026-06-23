import { EntityHeader } from "@/components/crm/entity-header";
import { OpportunityForm } from "@/components/crm/forms";
import { prisma } from "@/lib/prisma";
import { createOpportunity } from "@/server/actions/crm";

export const dynamic = "force-dynamic";

export default async function NewOpportunityPage() {
  const [companies, contacts, services, users] = await Promise.all([
    prisma.company.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
    prisma.contact.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
    prisma.service.findMany({ where: { deletedAt: null, isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.user.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-5">
      <EntityHeader description="Crea una oportunidad y calcula automaticamente montos comerciales." title="Nueva oportunidad" />
      <OpportunityForm action={createOpportunity} companies={companies} contacts={contacts} services={services} users={users} />
    </div>
  );
}
