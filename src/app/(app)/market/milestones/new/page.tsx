import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { EntityHeader } from "@/components/crm/entity-header";
import { CommercialMilestoneForm } from "@/components/market/forms";
import { prisma } from "@/lib/prisma";
import { createCommercialMilestone } from "@/server/actions/market";

export const dynamic = "force-dynamic";

export default async function NewMilestonePage() {
  const session = await auth();
  if (session?.user.role === UserRole.LECTURA) redirect("/market");

  const [companies, users] = await Promise.all([
    prisma.company.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-5">
      <EntityHeader
        description="Registra eventos de mercado, proyectos anunciados o movimientos relevantes."
        title="Nuevo hito comercial"
      />
      <CommercialMilestoneForm
        action={createCommercialMilestone}
        companies={companies}
        currentUserId={session?.user.id}
        users={users}
      />
    </div>
  );
}
