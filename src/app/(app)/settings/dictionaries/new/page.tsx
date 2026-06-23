import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { EntityHeader } from "@/components/crm/entity-header";
import { DictionaryValueForm } from "@/components/settings/forms";
import { createDictionaryValue } from "@/server/actions/settings";

export default async function NewDictionaryValuePage({
  searchParams,
}: {
  searchParams?: Promise<{ type?: string }>;
}) {
  const session = await auth();
  if (session?.user.role !== UserRole.ADMIN) redirect("/settings");
  const params = await searchParams;

  return (
    <div className="space-y-5">
      <EntityHeader
        description="Crea una clave estable y su etiqueta visible dentro de un diccionario comercial."
        title="Nuevo valor de diccionario"
      />
      <DictionaryValueForm
        action={createDictionaryValue}
        defaultType={params?.type}
      />
    </div>
  );
}
