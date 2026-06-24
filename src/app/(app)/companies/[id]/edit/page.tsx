import { UserRole } from "@prisma/client";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { EntityHeader } from "@/components/crm/entity-header";
import { CompanyForm } from "@/components/crm/forms";
import { prisma } from "@/lib/prisma";
import { updateCompany } from "@/server/actions/crm";

export const dynamic = "force-dynamic";

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (session?.user.role === UserRole.LECTURA) redirect(`/companies/${id}`);
  const [company, users] = await Promise.all([
    prisma.company.findFirst({ where: { id, deletedAt: null } }),
    prisma.user.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
  ]);

  if (!company) {
    notFound();
  }

  return (
    <div className="space-y-5">
      <EntityHeader description="Actualiza datos generales, estado y responsable comercial." title={`Editar ${company.name}`} />
      <CompanyForm action={updateCompany.bind(null, company.id)} company={company} users={users} />
    </div>
  );
}
