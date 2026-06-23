import { CompanyStatus } from "@prisma/client";
import Link from "next/link";

import { CompletenessIndicator } from "@/components/crm/completeness-indicator";
import { EntityHeader } from "@/components/crm/entity-header";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const q = params?.q?.trim();
  const status = params?.status as CompanyStatus | undefined;
  const companies = await prisma.company.findMany({
    where: {
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { industry: { contains: q, mode: "insensitive" } },
              { region: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(status ? { status } : {}),
    },
    include: { responsible: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-5">
      <EntityHeader
        actionHref="/companies/new"
        actionLabel="Nueva empresa"
        description="Gestiona cuentas, estados comerciales, responsables y datos base de clientes y prospectos."
        title="Empresas"
      />
      <form className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-[1fr_220px_auto]">
        <input
          className="h-10 rounded-md border border-slate-300 px-3 text-sm"
          defaultValue={q}
          name="q"
          placeholder="Buscar por nombre, industria o region"
        />
        <select
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
          defaultValue={status ?? ""}
          name="status"
        >
          <option value="">Todos los estados</option>
          {Object.values(CompanyStatus).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white">
          Filtrar
        </button>
      </form>
      <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Industria</th>
              <th className="px-4 py-3">Responsable</th>
              <th className="px-4 py-3">Completitud</th>
              <th className="px-4 py-3">Ultima interaccion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {companies.map((company) => (
              <tr key={company.id}>
                <td className="px-4 py-3 font-medium">
                  <Link className="hover:underline" href={`/companies/${company.id}`}>
                    {company.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{company.status}</td>
                <td className="px-4 py-3">{company.industry ?? "-"}</td>
                <td className="px-4 py-3">{company.responsible?.name ?? "-"}</td>
                <td className="px-4 py-3">
                  <CompletenessIndicator score={company.completeness} />
                </td>
                <td className="px-4 py-3">{formatDate(company.lastInteraction)}</td>
              </tr>
            ))}
            {companies.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                  No hay empresas para los filtros seleccionados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
