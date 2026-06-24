import { UserRole } from "@prisma/client";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { EntityHeader } from "@/components/crm/entity-header";
import { ContactForm } from "@/components/crm/forms";
import { prisma } from "@/lib/prisma";
import { updateContact } from "@/server/actions/crm";

export const dynamic = "force-dynamic";

export default async function EditContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (session?.user.role === UserRole.LECTURA) redirect(`/contacts/${id}`);
  const [contact, companies, users] = await Promise.all([
    prisma.contact.findFirst({ where: { id, deletedAt: null } }),
    prisma.company.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
  ]);

  if (!contact) notFound();

  return (
    <div className="space-y-5">
      <EntityHeader description="Actualiza datos, empresa, origen lead y responsable." title={`Editar ${contact.name}`} />
      <ContactForm action={updateContact.bind(null, contact.id)} companies={companies} contact={contact} users={users} />
    </div>
  );
}
