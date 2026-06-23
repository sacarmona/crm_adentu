import { EntityHeader } from "@/components/crm/entity-header";
import { ContactForm } from "@/components/crm/forms";
import { prisma } from "@/lib/prisma";
import { createContact } from "@/server/actions/crm";

export const dynamic = "force-dynamic";

export default async function NewContactPage() {
  const [companies, users] = await Promise.all([
    prisma.company.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-5">
      <EntityHeader description="Crea un contacto asociado a una empresa, responsable y origen comercial." title="Nuevo contacto" />
      <ContactForm action={createContact} companies={companies} users={users} />
    </div>
  );
}
