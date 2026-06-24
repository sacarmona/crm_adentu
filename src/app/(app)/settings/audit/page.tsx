import { AuditAction, UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { auditActionLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function compactJson(value: unknown) {
  if (!value) return "-";
  const text = JSON.stringify(value);
  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams?: Promise<{
    action?: string;
    entityType?: string;
    actorId?: string;
  }>;
}) {
  const session = await auth();
  if (session?.user.role !== UserRole.ADMIN) redirect("/settings");
  const params = await searchParams;
  const action = params?.action as AuditAction | undefined;
  const entityType = params?.entityType?.trim();
  const actorId = params?.actorId || undefined;

  const [logs, users, entityTypes] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        ...(action ? { action } : {}),
        ...(entityType ? { entityType } : {}),
        ...(actorId ? { actorId } : {}),
      },
      include: { actor: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.auditLog.findMany({
      distinct: ["entityType"],
      select: { entityType: true },
      orderBy: { entityType: "asc" },
    }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Auditoria</h1>
        <p className="mt-1 text-sm text-slate-600">
          Ultimos 200 eventos de escritura, importacion, IA y eliminacion
          logica.
        </p>
      </div>
      <form className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-[220px_220px_220px_auto]">
        <select
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
          defaultValue={action ?? ""}
          name="action"
        >
          <option value="">Todas las acciones</option>
          {Object.values(AuditAction).map((value) => (
            <option key={value} value={value}>
              {auditActionLabels[value]}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
          defaultValue={entityType ?? ""}
          name="entityType"
        >
          <option value="">Todas las entidades</option>
          {entityTypes.map((item) => (
            <option key={item.entityType} value={item.entityType}>
              {item.entityType}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
          defaultValue={actorId ?? ""}
          name="actorId"
        >
          <option value="">Todos los usuarios</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>
      <section className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="min-w-[1100px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Accion</th>
              <th className="px-4 py-3">Entidad</th>
              <th className="px-4 py-3">Antes</th>
              <th className="px-4 py-3">Despues / metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="whitespace-nowrap px-4 py-3">
                  {formatDateTime(log.createdAt)}
                </td>
                <td className="px-4 py-3">{log.actor?.name ?? "Sistema"}</td>
                <td className="px-4 py-3 font-medium">{auditActionLabels[log.action]}</td>
                <td className="px-4 py-3">
                  <p>{log.entityType}</p>
                  <p className="mt-1 font-mono text-xs text-slate-500">
                    {log.entityId}
                  </p>
                </td>
                <td className="max-w-sm px-4 py-3 font-mono text-xs text-slate-600">
                  {compactJson(log.before)}
                </td>
                <td className="max-w-sm px-4 py-3 font-mono text-xs text-slate-600">
                  {compactJson(log.after ?? log.metadata)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
