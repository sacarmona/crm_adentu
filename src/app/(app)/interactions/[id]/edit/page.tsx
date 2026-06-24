import { UserRole } from "@prisma/client";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { InteractionForm, localDateTimeValue } from "@/components/activity/forms";
import { EntityHeader } from "@/components/crm/entity-header";
import { prisma } from "@/lib/prisma";
import { updateInteraction } from "@/server/actions/activity";

export const dynamic = "force-dynamic";

export default async function EditInteractionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (session?.user.role === UserRole.LECTURA) {
    redirect("/interactions");
  }
  const { id } = await params;

  const [interaction, companies, contacts, opportunities, services] =
    await Promise.all([
      prisma.interaction.findFirst({ where: { id, deletedAt: null } }),
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

  if (!interaction) notFound();

  return (
    <div className="space-y-5">
      <EntityHeader
        description="Completa empresa, contacto, oportunidad y servicio cuando una interaccion (por ejemplo, creada desde Correo) quedo sin esos datos."
        title="Editar interaccion"
      />
      <InteractionForm
        action={updateInteraction.bind(null, interaction.id)}
        companies={companies}
        contacts={contacts}
        defaults={{
          date: localDateTimeValue(interaction.date),
          type: interaction.type,
          companyId: interaction.companyId ?? undefined,
          contactId: interaction.contactId ?? undefined,
          opportunityId: interaction.opportunityId ?? undefined,
          serviceId: interaction.serviceId ?? undefined,
          content: interaction.content,
          nextAction: interaction.nextAction ?? undefined,
          nextActionDate: interaction.nextActionDate
            ? localDateTimeValue(interaction.nextActionDate)
            : undefined,
        }}
        opportunities={opportunities}
        services={services}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
