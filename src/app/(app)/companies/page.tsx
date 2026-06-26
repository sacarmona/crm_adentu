import { CompanyStatus } from "@prisma/client";
import Link from "next/link";

import { auth } from "@/auth";
import { CompletenessIndicator } from "@/components/crm/completeness-indicator";
import { EntityHeader } from "@/components/crm/entity-header";
import { InlineSelectForm } from "@/components/crm/inline-select-form";
import { Pagination } from "@/components/crm/pagination";
import { formatDate } from "@/lib/format";
import { companyStatusLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { updateCompanyResponsible, updateCompanyStatus } from "@/server/actions/crm";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    industry?: string;
    responsibleId?: string;
    sort?: string;
    dir?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const q = params?.q?.trim();
  const status = params?.status as CompanyStatus | undefined;
  const industry = params?.industry;
  const responsibleId = params?.responsibleId;
  const sort = params?.sort === "lastInteraction" ? "lastInteraction" : undefined;
  const dir = params?.dir === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(params?.page) || 1);
  const where = {
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { industry: { contains: q, mode: "insensitive" as const } },
            { region: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(status ? { status } : {}),
    ...(industry ? { industry } : {}),
    ...(responsibleId === "none"
      ? { responsibleId: null }
      : responsibleId
        ? { responsibleId }
        : {}),
  };
  const canEdit = session?.user.role !== "LECTURA";
  const [companies, total, users, industries] = await Promise.all([
    prisma.company.findMany({
      where,
      include: { responsible: true },
      orderBy: sort === "lastInteraction" ? { lastInteraction: dir } : { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.company.count({ where }),
    prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.company.findMany({
      where: { deletedAt: null, industry: { not: null } },
      select: { industry: true },
      distinct: ["industry"],
      orderBy: { industry: "asc" },
    }),
  ]);
  const sortHref = (field: string) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (status) qs.set("status", status);
    if (industry) qs.set("industry", industry);
    if (responsibleId) qs.set("responsibleId", responsibleId);
    qs.set("sort", field);
    qs.set("dir", sort === field && dir === "desc" ? "asc" : "desc");
    return `/companies?${qs.toString()}`;
  };

  return (
    <div className="space-y-5">
      <EntityHeader
        actionHref={session?.user.role === "LECTURA" ? undefined : "/companies/new"}
        actionLabel={session?.user.role === "LECTURA" ? undefined : "Nueva empresa"}
        description="Gestiona cuentas, estados comerciales, responsables y datos base de clientes y prospectos."
        title="Empresas"
      />
      <form className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-[1fr_200px_200px_200px_auto]">
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
              {companyStatusLabels[value]}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
          defaultValue={industry ?? ""}
          name="industry"
        >
          <option value="">Todas las industrias</option>
          {industries.map(({ industry: value }) => (
            <option key={value} value={value ?? ""}>
              {value}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
          defaultValue={responsibleId ?? ""}
          name="responsibleId"
        >
          <option value="">Todos los responsables</option>
          <option value="none">Sin responsable</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
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
              <th className="px-4 py-3">
                <Link className="inline-flex items-center gap-1 hover:underline" href={sortHref("lastInteraction")}>
                  Ultima interaccion
                  {sort === "lastInteraction" ? (dir === "asc" ? " ↑" : " ↓") : null}
                </Link>
              </th>
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
                <td className="px-4 py-3">
                  {canEdit ? (
                    <InlineSelectForm
                      action={updateCompanyStatus.bind(null, company.id)}
                      defaultValue={company.status}
                      includeBlankOption={false}
                      name="status"
                      options={Object.values(CompanyStatus).map((value) => ({
                        value,
                        label: companyStatusLabels[value],
                      }))}
                    />
                  ) : (
                    companyStatusLabels[company.status]
                  )}
                </td>
                <td className="px-4 py-3">{company.industry ?? "-"}</td>
                <td className="px-4 py-3">
                  {canEdit ? (
                    <InlineSelectForm
                      action={updateCompanyResponsible.bind(null, company.id)}
                      defaultValue={company.responsibleId ?? ""}
                      name="responsibleId"
                      options={users.map((user) => ({ value: user.id, label: user.name }))}
                      placeholder="Sin responsable"
                    />
                  ) : (
                    company.responsible?.name ?? "-"
                  )}
                </td>
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
        <Pagination
          basePath="/companies"
          page={page}
          pageSize={PAGE_SIZE}
          params={{ q, status, industry, responsibleId, sort, dir: sort ? dir : undefined }}
          total={total}
        />
      </section>
    </div>
  );
}
