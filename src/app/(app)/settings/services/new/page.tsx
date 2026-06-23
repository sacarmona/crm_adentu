import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { EntityHeader } from "@/components/crm/entity-header";
import { ServiceForm } from "@/components/settings/forms";
import { createService } from "@/server/actions/settings";

export default async function NewServicePage() {
  const session = await auth();
  if (session?.user.role !== UserRole.ADMIN) redirect("/settings");

  return (
    <div className="space-y-5">
      <EntityHeader
        description="Agrega una linea de servicio disponible para oportunidades, actividad, mercado y playbooks."
        title="Nuevo servicio"
      />
      <ServiceForm action={createService} />
    </div>
  );
}
