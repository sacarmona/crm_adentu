import { UserRole } from "@prisma/client";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { EntityHeader } from "@/components/crm/entity-header";
import { ResetPasswordForm, UserPhoneForm, UserRoleForm } from "@/components/settings/forms";
import { formatDateTime } from "@/lib/format";
import { userRoleLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import {
  resetUserPassword,
  toggleUserActive,
  updateUserPhone,
  updateUserRole,
} from "@/server/actions/users";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (session?.user.role !== UserRole.ADMIN) redirect("/settings");
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) notFound();

  const isSelf = session?.user.id === user.id;

  return (
    <div className="space-y-5">
      <EntityHeader
        description={user.email}
        title={user.name}
      />

      <section className="max-w-xl space-y-4 rounded-md border border-slate-200 bg-white p-5">
        <div>
          <h2 className="font-semibold">Rol</h2>
          <p className="mt-1 text-sm text-slate-600">
            Define que puede ver y modificar este usuario en el CRM.
          </p>
          <div className="mt-3">
            {isSelf ? (
              <p className="text-sm text-slate-500">
                {userRoleLabels[user.role]} (no puedes cambiar tu propio rol).
              </p>
            ) : (
              <UserRoleForm
                action={updateUserRole.bind(null, user.id)}
                role={user.role}
              />
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <h2 className="font-semibold">Telefono</h2>
          <p className="mt-1 text-sm text-slate-600">
            Permite reconocer mensajes de WhatsApp enviados desde el numero de este usuario.
          </p>
          <div className="mt-3">
            <UserPhoneForm action={updateUserPhone.bind(null, user.id)} phone={user.phone} />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <h2 className="font-semibold">Restablecer contrasena</h2>
          <p className="mt-1 text-sm text-slate-600">
            Define una contrasena temporal; comunicasela al usuario por un canal seguro.
          </p>
          <div className="mt-3">
            <ResetPasswordForm action={resetUserPassword.bind(null, user.id)} />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <h2 className="font-semibold">Estado de la cuenta</h2>
          <p className="mt-1 text-sm text-slate-600">
            {user.deletedAt
              ? `Desactivada el ${formatDateTime(user.deletedAt)}.`
              : "La cuenta esta activa y puede iniciar sesion."}
          </p>
          <div className="mt-3">
            {isSelf ? (
              <p className="text-sm text-slate-500">
                No puedes desactivar tu propia cuenta.
              </p>
            ) : (
              <form action={toggleUserActive.bind(null, user.id)}>
                <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50">
                  {user.deletedAt ? "Reactivar cuenta" : "Desactivar cuenta"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
