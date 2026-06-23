import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { InteractionForm } from "@/components/activity/forms";
import { EntityHeader } from "@/components/crm/entity-header";
import { prisma } from "@/lib/prisma";
import { createInteraction } from "@/server/actions/activity";

export const dynamic = "force-dynamic";

export default async function NewInteractionPage({
  searchParams,
}: {
  searchParams?: Promise<{
    companyId?: string;
    contactId?: string;
    opportunityId?: string;
  }>;
}) {
  const session = await auth();
  const defaults = await searchParams;

  if (session?.user.role === UserRole.LECTURA) {
    redirect("/interactions");
  }

  const [companies, contacts, opportunities, services] = await Promise.all([
    prisma.company.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.contact.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.opportunity.findMany({
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
        description="Documenta el contacto comercial y, si corresponde, crea la proxima accion como tarea."
        title="Nueva interaccion"
      />
      <InteractionForm
        action={createInteraction}
        companies={companies}
        contacts={contacts}
        defaults={defaults}
        opportunities={opportunities}
        services={services}
      />
    </div>
  );
}
