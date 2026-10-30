import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { EntityHeader } from "@/components/crm/entity-header";
import { LeadForm } from "@/components/crm/lead-form";
import { prisma } from "@/lib/prisma";
import { createLead } from "@/server/actions/leads";

export const dynamic = "force-dynamic";

export default async function NewLeadPage() {
  const session = await auth();
  if (session?.user.role === UserRole.LECTURA) redirect("/leads");

  const [users, services] = await Promise.all([
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

  return (
    <div className="space-y-5">
      <EntityHeader
        description="Registra un lead con su medio de contacto y la fecha del ultimo contacto. Luego podras convertirlo en oportunidad."
        title="Nuevo lead"
      />
      <LeadForm action={createLead} services={services} users={users} />
    </div>
  );
}
