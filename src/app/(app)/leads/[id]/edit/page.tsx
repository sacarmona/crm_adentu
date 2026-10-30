import { UserRole } from "@prisma/client";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { EntityHeader } from "@/components/crm/entity-header";
import { LeadForm } from "@/components/crm/lead-form";
import { prisma } from "@/lib/prisma";
import { updateLead } from "@/server/actions/leads";

export const dynamic = "force-dynamic";

export default async function EditLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (session?.user.role === UserRole.LECTURA) redirect("/leads");
  const { id } = await params;

  const [lead, users, services] = await Promise.all([
    prisma.lead.findFirst({ where: { id, deletedAt: null } }),
    prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.service.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);
  if (!lead) notFound();

  return (
    <div className="space-y-5">
      <EntityHeader description="Actualiza los datos del lead." title={`Editar lead: ${lead.contactName}`} />
      <LeadForm action={updateLead.bind(null, lead.id)} lead={lead} services={services} users={users} />
    </div>
  );
}
