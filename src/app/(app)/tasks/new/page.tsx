import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { TaskForm } from "@/components/activity/task-form";
import { EntityHeader } from "@/components/crm/entity-header";
import { prisma } from "@/lib/prisma";
import { createTask } from "@/server/actions/activity";

export const dynamic = "force-dynamic";

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams?: Promise<{
    companyId?: string;
    contactId?: string;
    opportunityId?: string;
  }>;
}) {
  const session = await auth();
  const defaults = await searchParams;

  if (session?.user.role === UserRole.LECTURA) {
    redirect("/tasks");
  }

  const [companies, contacts, opportunities, services, users] =
    await Promise.all([
      prisma.company.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.contact.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, companyId: true },
        orderBy: { name: "asc" },
      }),
      prisma.opportunity.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, companyId: true, serviceId: true },
        orderBy: { name: "asc" },
      }),
      prisma.service.findMany({
        where: { deletedAt: null, isActive: true },
        select: { id: true, name: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.user.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

  return (
    <div className="space-y-5">
      <EntityHeader
        description="Programa una accion comercial, asigna responsable y relaciona el contexto correspondiente."
        title="Nueva tarea"
      />
      <TaskForm
        action={createTask}
        companies={companies}
        contacts={contacts}
        currentUserId={session?.user.id}
        defaults={defaults}
        opportunities={opportunities}
        services={services}
        users={users}
      />
    </div>
  );
}
