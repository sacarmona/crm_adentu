import { UserRole } from "@prisma/client";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { EntityHeader } from "@/components/crm/entity-header";
import { PlaybookItemForm } from "@/components/playbooks/forms";
import { prisma } from "@/lib/prisma";
import { updatePlaybookItem } from "@/server/actions/playbooks";

export default async function EditPlaybookItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (session?.user.role === UserRole.LECTURA) redirect("/playbooks");
  const { id } = await params;
  const item = await prisma.playbookItem.findFirst({
    where: { id, deletedAt: null },
    include: { playbook: true },
  });
  if (!item) notFound();

  return (
    <div className="space-y-5">
      <EntityHeader
        description="Actualiza el contenido y su posicion dentro de la guia."
        title={`Editar elemento · ${item.playbook.name}`}
      />
      <PlaybookItemForm
        action={updatePlaybookItem.bind(null, item.id)}
        item={item}
      />
    </div>
  );
}
