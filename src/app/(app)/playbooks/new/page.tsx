import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { EntityHeader } from "@/components/crm/entity-header";
import { PlaybookForm } from "@/components/playbooks/forms";
import { prisma } from "@/lib/prisma";
import { createPlaybook } from "@/server/actions/playbooks";

export default async function NewPlaybookPage() {
  const session = await auth();
  if (session?.user.role === UserRole.LECTURA) redirect("/playbooks");
  const services = await prisma.service.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, name: true, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-5">
      <EntityHeader
        description="Crea una guia general o asociada a un servicio comercial."
        title="Nuevo playbook"
      />
      <PlaybookForm action={createPlaybook} services={services} />
    </div>
  );
}
