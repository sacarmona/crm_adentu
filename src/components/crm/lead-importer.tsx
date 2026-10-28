"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { contactMediumLabels } from "@/lib/labels";
import { commitLeadImport, parseLeadImport } from "@/server/actions/leads";
import type { LeadImportPreview } from "@/server/services/lead-import";

export function LeadImporter() {
  const [isParsing, startParsing] = useTransition();
  const [isCommitting, startCommitting] = useTransition();
  const [preview, setPreview] = useState<LeadImportPreview | null>(null);
  const [committed, setCommitted] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleParse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setCommitted(null);
    startParsing(async () => {
      const result = await parseLeadImport(formData);
      setPreview(result);
    });
  }

  function handleCommit() {
    if (!preview) return;
    startCommitting(async () => {
      const result = await commitLeadImport(preview.rows);
      setCommitted(result.created);
      setPreview(null);
      formRef.current?.reset();
    });
  }

  return (
    <div className="space-y-5">
      <form
        className="rounded-md border border-slate-200 bg-white p-5"
        onSubmit={handleParse}
        ref={formRef}
      >
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Archivo CSV o Excel</span>
          <input
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
            name="file"
            required
            type="file"
          />
        </label>
        <p className="mt-2 text-xs text-slate-500">
          Columnas: <strong>Contacto</strong> (obligatorio), Empresa, Medio, Email, Telefono, Ultimo
          contacto, Notas. Hasta 5 MB y 1.000 filas.
        </p>
        <Button className="mt-4" disabled={isParsing} type="submit">
          {isParsing ? "Leyendo..." : "Leer archivo"}
        </Button>
      </form>

      {committed !== null ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Se importaron <strong>{committed}</strong> lead{committed !== 1 ? "s" : ""} correctamente.{" "}
          <Link className="font-medium underline" href="/leads">
            Ver leads
          </Link>
        </div>
      ) : null}

      {preview?.error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {preview.error}
        </div>
      ) : null}

      {preview && !preview.error ? (
        <div className="space-y-3 rounded-md border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-3 text-sm">
              <span>
                Total: <strong>{preview.total}</strong>
              </span>
              <span className="text-emerald-700">
                Validas: <strong>{preview.validCount}</strong>
              </span>
              <span className="text-rose-700">
                Con error: <strong>{preview.errorCount}</strong>
              </span>
            </div>
            <Button disabled={isCommitting || preview.validCount === 0} onClick={handleCommit}>
              {isCommitting ? "Importando..." : `Importar ${preview.validCount} leads`}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Contacto</th>
                  <th className="px-3 py-2">Empresa</th>
                  <th className="px-3 py-2">Medio</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Telefono</th>
                  <th className="px-3 py-2">Ultimo contacto</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.rows.slice(0, 200).map((row) => (
                  <tr key={row.rowNumber} className={row.valid ? "" : "bg-rose-50/50"}>
                    <td className="px-3 py-2 text-xs text-slate-400">{row.rowNumber}</td>
                    <td className="px-3 py-2">{row.contactName || "—"}</td>
                    <td className="px-3 py-2">{row.companyName ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{contactMediumLabels[row.medium]}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{row.email ?? "—"}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{row.phone ?? "—"}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{row.lastContactAt ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">
                      {row.valid ? (
                        <span className="text-emerald-700">OK</span>
                      ) : (
                        <span className="text-rose-700">{row.issue}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.rows.length > 200 ? (
              <p className="mt-2 text-xs text-slate-400">
                Mostrando las primeras 200 filas de {preview.rows.length}.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
