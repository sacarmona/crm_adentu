import { UserRole } from "@prisma/client";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { EntityHeader } from "@/components/crm/entity-header";
import { ServiceForm } from "@/components/settings/forms";
import { prisma } from "@/lib/prisma";
import { updateService } from "@/server/actions/settings";

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (session?.user.role !== UserRole.ADMIN) redirect("/settings");
  const { id } = await params;
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) notFound();

  return (
    <div className="space-y-5">
      <EntityHeader
        description="La desactivacion lo retira de nuevas selecciones sin alterar registros historicos."
        title={`Editar ${service.name}`}
      />
      <ServiceForm
        action={updateService.bind(null, service.id)}
        service={service}
      />
    </div>
  );
}
