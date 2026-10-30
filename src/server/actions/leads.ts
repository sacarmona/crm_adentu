"use server";

import { AuditAction, LeadStatus, OpportunityStatus, TaskStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { normalizeName, nullableDate } from "@/lib/normalize";
import { prisma } from "@/lib/prisma";
import { leadContactLogSchema, leadSchema } from "@/schemas/crm";
import { requireAdmin, requireWriter } from "@/server/authz";
import { syncTaskCalendarEvent } from "@/server/services/task-calendar-sync";
import {
  type LeadImportPreview,
  type LeadImportRow,
  MAX_LEAD_IMPORT_BYTES,
  MAX_LEAD_IMPORT_ROWS,
  parseLeadsCsv,
  parseLeadsXlsx,
} from "@/server/services/lead-import";

function parseForm(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

/**
 * Crea o actualiza la tarea de "proxima accion" vinculada al lead.
 * Si hay una tarea pendiente del lead, la actualiza; si no, crea una.
 * Devuelve el id de la tarea afectada (para sincronizar con Calendar).
 */
async function syncLeadNextActionTask(input: {
  leadId: string;
  nextAction: string | null;
  nextActionDate: string | null;
  serviceId: string | null;
  assignedToId: string | null;
  createdById: string;
}): Promise<string | null> {
  if (!input.nextAction) return null;
  const dueDate = nullableDate(input.nextActionDate);

  const existing = await prisma.task.findFirst({
    where: { leadId: input.leadId, deletedAt: null, status: TaskStatus.PENDING },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (existing) {
    await prisma.task.update({
      where: { id: existing.id },
      data: {
        title: input.nextAction,
        dueDate,
        serviceId: input.serviceId,
        assignedToId: input.assignedToId ?? input.createdById,
      },
    });
    return existing.id;
  }

  const task = await prisma.task.create({
    data: {
      title: input.nextAction,
      status: TaskStatus.PENDING,
      dueDate,
      leadId: input.leadId,
      serviceId: input.serviceId,
      assignedToId: input.assignedToId ?? input.createdById,
      createdById: input.createdById,
    },
  });
  return task.id;
}

export async function createLead(formData: FormData) {
  const user = await requireWriter("No tienes permisos para registrar leads.");
  const data = leadSchema.parse(parseForm(formData));
  const contactedAt = nullableDate(data.lastContactAt) ?? new Date();

  const lead = await prisma.lead.create({
    data: {
      contactName: data.contactName,
      companyName: data.companyName,
      email: data.email,
      phone: data.phone,
      medium: data.medium,
      status: data.status,
      serviceId: data.serviceId,
      notes: data.notes,
      nextAction: data.nextAction,
      nextActionDate: nullableDate(data.nextActionDate),
      lastContactAt: contactedAt,
      responsibleId: data.responsibleId,
      createdById: user.id,
      contactLogs: {
        create: {
          medium: data.medium,
          contactedAt,
          notes: data.notes,
          createdById: user.id,
        },
      },
    },
  });

  const taskId = await syncLeadNextActionTask({
    leadId: lead.id,
    nextAction: data.nextAction,
    nextActionDate: data.nextActionDate,
    serviceId: data.serviceId,
    assignedToId: data.responsibleId,
    createdById: user.id,
  });

  await prisma.auditLog.create({
    data: {
      action: AuditAction.CREATE,
      entityType: "Lead",
      entityId: lead.id,
      actorId: user.id,
      after: { contactName: lead.contactName, companyName: lead.companyName },
    },
  });

  if (taskId) await syncTaskCalendarEvent(taskId);

  revalidatePath("/leads");
  revalidatePath("/tasks");
  redirect(`/leads/${lead.id}`);
}

export async function updateLead(id: string, formData: FormData) {
  const user = await requireWriter("No tienes permisos para modificar leads.");
  const data = leadSchema.parse(parseForm(formData));
  const before = await prisma.lead.findFirst({ where: { id, deletedAt: null } });
  if (!before) throw new Error("El lead ya no esta disponible.");

  await prisma.lead.update({
    where: { id },
    data: {
      contactName: data.contactName,
      companyName: data.companyName,
      email: data.email,
      phone: data.phone,
      medium: data.medium,
      status: data.status,
      serviceId: data.serviceId,
      notes: data.notes,
      nextAction: data.nextAction,
      nextActionDate: nullableDate(data.nextActionDate),
      lastContactAt: nullableDate(data.lastContactAt) ?? before.lastContactAt,
      responsibleId: data.responsibleId,
    },
  });

  const taskId = await syncLeadNextActionTask({
    leadId: id,
    nextAction: data.nextAction,
    nextActionDate: data.nextActionDate,
    serviceId: data.serviceId,
    assignedToId: data.responsibleId,
    createdById: user.id,
  });

  await prisma.auditLog.create({
    data: {
      action: AuditAction.UPDATE,
      entityType: "Lead",
      entityId: id,
      actorId: user.id,
      after: { contactName: data.contactName, status: data.status },
    },
  });

  if (taskId) await syncTaskCalendarEvent(taskId);

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/tasks");
  redirect(`/leads/${id}`);
}

export async function addLeadContact(leadId: string, formData: FormData) {
  const user = await requireWriter("No tienes permisos para registrar contactos.");
  const data = leadContactLogSchema.parse(parseForm(formData));
  const lead = await prisma.lead.findFirst({ where: { id: leadId, deletedAt: null } });
  if (!lead) throw new Error("El lead ya no esta disponible.");
  const contactedAt = nullableDate(data.contactedAt) ?? new Date();

  await prisma.$transaction([
    prisma.leadContactLog.create({
      data: {
        leadId,
        medium: data.medium,
        contactedAt,
        notes: data.notes,
        createdById: user.id,
      },
    }),
    prisma.lead.update({
      where: { id: leadId },
      data: {
        medium: data.medium,
        lastContactAt:
          !lead.lastContactAt || contactedAt > lead.lastContactAt ? contactedAt : lead.lastContactAt,
        status:
          lead.status === LeadStatus.NUEVO ? LeadStatus.CONTACTADO : lead.status,
      },
    }),
  ]);

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  redirect(`/leads/${leadId}`);
}

export async function updateLeadStatus(id: string, formData: FormData) {
  const user = await requireWriter("No tienes permisos para modificar leads.");
  const status = formData.get("status") as LeadStatus | null;
  if (!status) return;
  await prisma.lead.update({ where: { id }, data: { status } });
  await prisma.auditLog.create({
    data: {
      action: AuditAction.UPDATE,
      entityType: "Lead",
      entityId: id,
      actorId: user.id,
      after: { status },
    },
  });
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
}

export async function convertLeadToOpportunity(leadId: string) {
  const user = await requireWriter("No tienes permisos para convertir leads.");
  const lead = await prisma.lead.findFirst({ where: { id: leadId, deletedAt: null } });
  if (!lead) throw new Error("El lead ya no esta disponible.");
  if (lead.convertedOpportunityId) {
    redirect(`/opportunities/${lead.convertedOpportunityId}`);
  }

  let companyId: string | null = null;
  if (lead.companyName) {
    const normalizedName = normalizeName(lead.companyName);
    const existing = await prisma.company.findFirst({
      where: { deletedAt: null, normalizedName },
    });
    companyId =
      existing?.id ??
      (await prisma.company.create({ data: { name: lead.companyName, normalizedName } })).id;
  }

  const contact = await prisma.contact.create({
    data: {
      name: lead.contactName,
      email: lead.email,
      phone: lead.phone,
      companyId,
    },
  });

  const opportunity = await prisma.opportunity.create({
    data: {
      name: lead.companyName ? `${lead.companyName} - ${lead.contactName}` : lead.contactName,
      companyId,
      primaryContactId: contact.id,
      responsibleId: lead.responsibleId,
      status: OpportunityStatus.EXPLORATION,
    },
  });

  await prisma.$transaction([
    prisma.lead.update({
      where: { id: leadId },
      data: {
        status: LeadStatus.CONVERTIDO,
        convertedOpportunityId: opportunity.id,
        convertedAt: new Date(),
      },
    }),
    prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: "Lead",
        entityId: leadId,
        actorId: user.id,
        after: { status: "CONVERTIDO", opportunityId: opportunity.id },
      },
    }),
  ]);

  revalidatePath("/leads");
  revalidatePath("/opportunities");
  redirect(`/opportunities/${opportunity.id}`);
}

export async function parseLeadImport(formData: FormData): Promise<LeadImportPreview> {
  await requireWriter("No tienes permisos para importar leads.");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { rows: [], total: 0, validCount: 0, errorCount: 0, error: "Selecciona un archivo." };
  }
  if (file.size > MAX_LEAD_IMPORT_BYTES) {
    return { rows: [], total: 0, validCount: 0, errorCount: 0, error: "El archivo supera los 5 MB." };
  }

  const name = file.name.toLowerCase();
  try {
    let rows: LeadImportRow[];
    if (name.endsWith(".csv")) {
      rows = parseLeadsCsv(await file.text());
    } else if (name.endsWith(".xlsx")) {
      rows = await parseLeadsXlsx(Buffer.from(await file.arrayBuffer()));
    } else {
      return {
        rows: [],
        total: 0,
        validCount: 0,
        errorCount: 0,
        error: "Formato no soportado. Usa .csv o .xlsx.",
      };
    }

    const validCount = rows.filter((row) => row.valid).length;
    return {
      rows,
      total: rows.length,
      validCount,
      errorCount: rows.length - validCount,
    };
  } catch {
    return {
      rows: [],
      total: 0,
      validCount: 0,
      errorCount: 0,
      error: "No se pudo leer el archivo. Verifica el formato.",
    };
  }
}

export async function commitLeadImport(
  rows: LeadImportRow[],
): Promise<{ created: number }> {
  const user = await requireWriter("No tienes permisos para importar leads.");
  const valid = rows.filter((row) => row.valid && row.contactName).slice(0, MAX_LEAD_IMPORT_ROWS);
  if (valid.length === 0) return { created: 0 };

  await prisma.$transaction(
    valid.map((row) => {
      const contactedAt = nullableDate(row.lastContactAt) ?? new Date();
      return prisma.lead.create({
        data: {
          contactName: row.contactName,
          companyName: row.companyName,
          email: row.email,
          phone: row.phone,
          medium: row.medium,
          status: LeadStatus.NUEVO,
          lastContactAt: contactedAt,
          notes: row.notes,
          createdById: user.id,
          contactLogs: {
            create: {
              medium: row.medium,
              contactedAt,
              notes: row.notes,
              createdById: user.id,
            },
          },
        },
      });
    }),
  );

  revalidatePath("/leads");
  return { created: valid.length };
}

export async function deleteLead(id: string) {
  const user = await requireAdmin("Solo ADMIN puede eliminar leads.");
  await prisma.lead.update({ where: { id }, data: { deletedAt: new Date() } });
  await prisma.auditLog.create({
    data: {
      action: AuditAction.SOFT_DELETE,
      entityType: "Lead",
      entityId: id,
      actorId: user.id,
    },
  });
  revalidatePath("/leads");
  redirect("/leads");
}
