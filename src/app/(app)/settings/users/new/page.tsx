import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { EntityHeader } from "@/components/crm/entity-header";
import { UserForm } from "@/components/settings/forms";
import { createUserAccount } from "@/server/actions/users";

export default async function NewUserPage() {
  const session = await auth();
  if (session?.user.role !== UserRole.ADMIN) redirect("/settings");

  return (
    <div className="space-y-5">
      <EntityHeader
        description="Crea una cuenta con su rol inicial. El usuario puede cambiar su contrasena despues de ingresar."
        title="Nuevo usuario"
      />
      <UserForm action={createUserAccount} />
    </div>
  );
}
