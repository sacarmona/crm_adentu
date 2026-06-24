import { CompanyForm } from "@/components/crm/forms";
import { EntityHeader } from "@/components/crm/entity-header";
import { prisma } from "@/lib/prisma";
import { createCompany } from "@/server/actions/crm";

export const dynamic = "force-dynamic";

export default async function NewCompanyPage() {
  const session = await auth();
  if (session?.user.role === UserRole.LECTURA) redirect("/companies");
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-5">
      <EntityHeader
        description="Crea una nueva empresa o prospecto para gestionar contactos, oportunidades e interacciones."
        title="Nueva empresa"
      />
      <CompanyForm action={createCompany} users={users} />
    </div>
  );
}
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
