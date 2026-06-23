import {
  ImportBatchStatus,
  ImportRowStatus,
  UserRole,
} from "@prisma/client";
import { AlertTriangle, CheckCircle2, CircleX, FileCheck2 } from "lucide-react";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  cancelImportBatch,
  confirmImportBatch,
} from "@/server/actions/import";

export const dynamic = "force-dynamic";

const rowStyles: Record<ImportRowStatus, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  VALID: "bg-emerald-50 text-emerald-700",
  WARNING: "bg-amber-50 text-amber-700",
  ERROR: "bg-rose-50 text-rose-700",
  IMPORTED: "bg-sky-50 text-sky-700",
  SKIPPED: "bg-slate-100 text-slate-500",
};

function displayJson(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "-";
  }

  return Object.entries(value)
    .filter(([, item]) => item !== null && item !== "")
    .slice(0, 6)
    .map(([key, item]) => `${key}: ${String(item)}`)
    .join(" · ");
}

function displayIssues(value: unknown) {
  return Array.isArray(value) ? value.map(String).join(" · ") : "";
}

export default async function ImportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;
  const [batch, groupedCounts] = await Promise.all([
    prisma.importBatch.findUnique({
      where: { id },
      include: {
        createdBy: true,
        rows: {
          orderBy: [{ sheetName: "asc" }, { rowNumber: "asc" }],
          take: 250,
        },
      },
    }),
    prisma.importRow.groupBy({
      by: ["status"],
      where: { importBatchId: id },
      _count: { _all: true },
    }),
  ]);

  if (!batch) {
    notFound();
  }

  const counts = Object.fromEntries(
    Object.values(ImportRowStatus).map((status) => [
      status,
      groupedCounts.find((item) => item.status === status)?._count._all ?? 0,
    ]),
  ) as Record<ImportRowStatus, number>;
  const isAdmin = session?.user.role === UserRole.ADMIN;
  const canConfirm = isAdmin && batch.status === ImportBatchStatus.READY;

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Lote de importacion
            </p>
            <h1 className="mt-1 text-2xl font-semibold">{batch.fileName}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {batch.status} · creado por{" "}
              {batch.createdBy?.name ?? "Sin usuario"} ·{" "}
              {formatDateTime(batch.createdAt)}
            </p>
          </div>
          {canConfirm ? (
            <div className="flex gap-2">
              <form action={cancelImportBatch.bind(null, batch.id)}>
                <Button type="submit" variant="outline">
                  Cancelar lote
                </Button>
              </form>
              <form action={confirmImportBatch.bind(null, batch.id)}>
                <Button type="submit">
                  <FileCheck2 className="h-4 w-4" aria-hidden="true" />
                  Confirmar importacion
                </Button>
              </form>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Summary
          icon={CheckCircle2}
          label="Validas"
          tone="text-emerald-700"
          value={counts.VALID + counts.IMPORTED}
        />
        <Summary
          icon={AlertTriangle}
          label="Advertencias"
          tone="text-amber-700"
          value={counts.WARNING + counts.SKIPPED}
        />
        <Summary
          icon={CircleX}
          label="Errores"
          tone="text-rose-700"
          value={counts.ERROR}
        />
        <Summary
          icon={FileCheck2}
          label="Total visible"
          tone="text-sky-700"
          value={Object.values(counts).reduce((sum, value) => sum + value, 0)}
        />
      </section>

      {batch.rows.length === 250 ? (
        <p className="text-xs text-amber-700">
          La previsualizacion muestra las primeras 250 filas del lote.
        </p>
      ) : null}

      <section className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="min-w-[980px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Hoja / fila</th>
              <th className="px-4 py-3">Entidad</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Datos normalizados</th>
              <th className="px-4 py-3">Incidencias</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {batch.rows.map((row) => (
              <tr key={row.id}>
                <td className="whitespace-nowrap px-4 py-3">
                  {row.sheetName} · {row.rowNumber}
                </td>
                <td className="px-4 py-3 font-medium">{row.targetModel}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-semibold ${rowStyles[row.status]}`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="max-w-xl px-4 py-3 text-xs leading-5 text-slate-600">
                  {displayJson(row.normalizedData)}
                </td>
                <td className="max-w-sm px-4 py-3 text-xs leading-5 text-rose-700">
                  {displayIssues(row.issues) || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Summary({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof CheckCircle2;
  tone: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <Icon className={`h-5 w-5 ${tone}`} aria-hidden="true" />
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </div>
  );
}
