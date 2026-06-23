import { UserRole } from "@prisma/client";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { EntityHeader } from "@/components/crm/entity-header";
import { DictionaryValueForm } from "@/components/settings/forms";
import { prisma } from "@/lib/prisma";
import { updateDictionaryValue } from "@/server/actions/settings";

export default async function EditDictionaryValuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (session?.user.role !== UserRole.ADMIN) redirect("/settings");
  const { id } = await params;
  const value = await prisma.dictionaryValue.findUnique({ where: { id } });
  if (!value) notFound();

  return (
    <div className="space-y-5">
      <EntityHeader
        description="Actualiza la etiqueta, descripcion, orden y vigencia sin cambiar la clave historica."
        title={`Editar ${value.label}`}
      />
      <DictionaryValueForm
        action={updateDictionaryValue.bind(null, value.id)}
        value={value}
      />
    </div>
  );
}
