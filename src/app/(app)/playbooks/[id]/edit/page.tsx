import { UserRole } from "@prisma/client";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { EntityHeader } from "@/components/crm/entity-header";
import { PlaybookForm } from "@/components/playbooks/forms";
import { prisma } from "@/lib/prisma";
import { updatePlaybook } from "@/server/actions/playbooks";

export default async function EditPlaybookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (session?.user.role === UserRole.LECTURA) redirect("/playbooks");
  const { id } = await params;
  const playbook = await prisma.playbook.findFirst({
    where: { id, deletedAt: null },
  });
  if (!playbook) notFound();
  const services = await prisma.service.findMany({
    where: {
      deletedAt: null,
      OR: [
        { isActive: true },
        ...(playbook.serviceId ? [{ id: playbook.serviceId }] : []),
      ],
    },
    select: { id: true, name: true, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-5">
      <EntityHeader
        description="Actualiza el servicio, descripcion y disponibilidad de la guia."
        title={`Editar ${playbook.name}`}
      />
      <PlaybookForm
        action={updatePlaybook.bind(null, playbook.id)}
        playbook={playbook}
        services={services}
      />
    </div>
  );
}
