import { ImportBatchStatus, UserRole } from "@prisma/client";
import { FileSpreadsheet, Upload } from "lucide-react";
import Link from "next/link";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { importBatchStatusLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { uploadImportBatch } from "@/server/actions/import";

export const dynamic = "force-dynamic";

const statusStyles: Record<ImportBatchStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  VALIDATING: "bg-sky-50 text-sky-700",
  READY: "bg-amber-50 text-amber-700",
  IMPORTED: "bg-emerald-50 text-emerald-700",
  FAILED: "bg-rose-50 text-rose-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};

export default async function ImportPage() {
  const session = await auth();
  const batches = await prisma.importBatch.findMany({
    include: {
      createdBy: true,
      _count: { select: { rows: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const isAdmin = session?.user.role === UserRole.ADMIN;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Importar datos</h1>
        <p className="mt-1 text-sm text-slate-600">
          Valida archivos Excel antes de incorporar empresas, contactos y
          oportunidades al CRM.
        </p>
      </div>

      {isAdmin ? (
        <section className="grid gap-5 border-y border-slate-200 bg-white px-5 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
          <form action={uploadImportBatch} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Archivo Excel
              </span>
              <input
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
                name="file"
                required
                type="file"
              />
            </label>
            <p className="text-xs text-slate-500">
              Formato `.xlsx`, hasta 5 MB y 1.000 filas por lote.
            </p>
            <Button type="submit">
              <Upload className="h-4 w-4" aria-hidden="true" />
              Cargar y validar
            </Button>
          </form>

          <div className="border-l-0 border-slate-200 lg:border-l lg:pl-5">
            <h2 className="text-sm font-semibold">Estructura admitida</h2>
            <dl className="mt-3 space-y-3 text-xs text-slate-600">
              <div>
                <dt className="font-semibold text-slate-800">Empresas / EMPR</dt>
                <dd>Nombre, Industria, Region, Estado, Tamano, Notas</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-800">Contactos / CONT</dt>
                <dd>
                  Nombre, Empresa, Cargo/Area, Estado, Email, Telefono, Origen
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-800">
                  Oportunidades / OPOR
                </dt>
                <dd>
                  Nombre, Empresa, Contacto, Servicio, Estado, Probabilidad,
                  Moneda, Precio, Tipo Cambio, Cantidad, Meses
                </dd>
              </div>
            </dl>
          </div>
        </section>
      ) : (
        <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
          La carga y confirmacion de importaciones esta reservada al rol ADMIN.
        </div>
      )}

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">Historial de lotes</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Archivo</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Filas</th>
              <th className="px-4 py-3">Creado por</th>
              <th className="px-4 py-3">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {batches.map((batch) => (
              <tr key={batch.id}>
                <td className="px-4 py-3">
                  <Link
                    className="flex items-center gap-2 font-medium hover:underline"
                    href={`/import/${batch.id}`}
                  >
                    <FileSpreadsheet
                      className="h-4 w-4 text-emerald-700"
                      aria-hidden="true"
                    />
                    {batch.fileName}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-semibold ${statusStyles[batch.status]}`}
                  >
                    {importBatchStatusLabels[batch.status]}
                  </span>
                </td>
                <td className="px-4 py-3">{batch._count.rows}</td>
                <td className="px-4 py-3">
                  {batch.createdBy?.name ?? "Sin usuario"}
                </td>
                <td className="px-4 py-3">{formatDateTime(batch.createdAt)}</td>
              </tr>
            ))}
            {batches.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-8 text-center text-slate-500"
                  colSpan={5}
                >
                  No hay lotes de importacion.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
