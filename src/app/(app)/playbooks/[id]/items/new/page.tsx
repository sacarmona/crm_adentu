import { UserRole } from "@prisma/client";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { EntityHeader } from "@/components/crm/entity-header";
import { PlaybookItemForm } from "@/components/playbooks/forms";
import { prisma } from "@/lib/prisma";
import { createPlaybookItem } from "@/server/actions/playbooks";

export default async function NewPlaybookItemPage({
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

  return (
    <div className="space-y-5">
      <EntityHeader
        description="Agrega una pregunta, criterio, objecion, siguiente paso, documento o punto de checklist."
        title={`Nuevo elemento · ${playbook.name}`}
      />
      <PlaybookItemForm action={createPlaybookItem.bind(null, playbook.id)} />
    </div>
  );
}
