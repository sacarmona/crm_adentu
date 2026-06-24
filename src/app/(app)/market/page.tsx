import { UserRole } from "@prisma/client";
import { CalendarDays, Factory, Plus } from "lucide-react";
import Link from "next/link";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { deleteCommercialMilestone } from "@/server/actions/market";
import { marketAssetCoverage } from "@/server/services/market";

export const dynamic = "force-dynamic";

export default async function MarketPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string; q?: string; serviceId?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const view = params?.view === "milestones" ? "milestones" : "assets";
  const q = params?.q?.trim();
  const serviceId = params?.serviceId || undefined;
  const canEdit = session?.user.role !== UserRole.LECTURA;
  const [assets, milestones, services] = await Promise.all([
    prisma.marketAsset.findMany({
      where: {
        deletedAt: null,
        ...(serviceId ? { serviceId } : {}),
        ...(q
          ? {
              OR: [
                { unitName: { contains: q, mode: "insensitive" } },
                { ownerName: { contains: q, mode: "insensitive" } },
                { constructionCompany: { contains: q, mode: "insensitive" } },
                { operationMaintenance: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        service: true,
        ownerCompany: true,
        constructionCompanyRef: true,
        omCompany: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.commercialMilestone.findMany({
      where: {
        deletedAt: null,
        ...(q
          ? {
              OR: [
                { project: { contains: q, mode: "insensitive" } },
                { industry: { contains: q, mode: "insensitive" } },
                { company: { name: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: { company: true, owner: true },
      orderBy: { date: "desc" },
      take: 100,
    }),
    prisma.service.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Mercado</h1>
          <p className="mt-1 text-sm text-slate-600">
            Activos, empresas participantes e hitos que pueden originar
            oportunidades.
          </p>
        </div>
        {canEdit ? (
          <Button asChild>
            <Link
              href={
                view === "assets"
                  ? "/market/assets/new"
                  : "/market/milestones/new"
              }
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {view === "assets" ? "Nuevo activo" : "Nuevo hito"}
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        <Link
          className={`px-4 py-2 text-sm font-medium ${view === "assets" ? "border-b-2 border-slate-950 text-slate-950" : "text-slate-500"}`}
          href="/market"
        >
          Activos
        </Link>
        <Link
          className={`px-4 py-2 text-sm font-medium ${view === "milestones" ? "border-b-2 border-slate-950 text-slate-950" : "text-slate-500"}`}
          href="/market?view=milestones"
        >
          Hitos
        </Link>
      </div>

      <form className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-[1fr_240px_auto]">
        <input name="view" type="hidden" value={view} />
        <input
          className="h-10 rounded-md border border-slate-300 px-3 text-sm"
          defaultValue={q}
          name="q"
          placeholder="Buscar unidad, empresa, proyecto o industria"
        />
        <select
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
          defaultValue={serviceId ?? ""}
          disabled={view === "milestones"}
          name="serviceId"
        >
          <option value="">Todos los servicios</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      {view === "assets" ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => (
            <article
              className="rounded-md border border-slate-200 bg-white p-4"
              key={asset.id}
            >
              <div className="flex items-start justify-between gap-3">
                <Factory className="h-5 w-5 text-teal-700" aria-hidden="true" />
                <span className="text-xs font-semibold text-slate-500">
                  {asset.quantity.toString()} unidad(es)
                </span>
              </div>
              <Link
                className="mt-3 block font-semibold hover:underline"
                href={`/market/assets/${asset.id}`}
              >
                {asset.unitName}
              </Link>
              <p className="mt-1 text-sm text-slate-500">
                {asset.service?.name ?? "Sin servicio sugerido"}
              </p>
              <dl className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Propietario</dt>
                  <dd className="text-right font-medium">
                    {asset.ownerCompany?.name ?? asset.ownerName ?? "-"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">O&M</dt>
                  <dd className="text-right font-medium">
                    {asset.omCompany?.name ??
                      asset.operationMaintenance ??
                      "-"}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-slate-500">
                {marketAssetCoverage(asset)}/3 roles vinculados al CRM
              </p>
            </article>
          ))}
          {assets.length === 0 ? (
            <p className="col-span-full py-10 text-center text-sm text-slate-500">
              No hay activos para los filtros seleccionados.
            </p>
          ) : null}
        </section>
      ) : (
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Proyecto / hito</th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Industria</th>
                <th className="px-4 py-3">Responsable</th>
                {canEdit ? <th className="px-4 py-3">Accion</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {milestones.map((milestone) => (
                <tr key={milestone.id}>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <CalendarDays
                        className="h-4 w-4 text-slate-400"
                        aria-hidden="true"
                      />
                      {formatDate(milestone.date)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {milestone.project}
                  </td>
                  <td className="px-4 py-3">
                    {milestone.company?.name ?? "-"}
                  </td>
                  <td className="px-4 py-3">{milestone.industry ?? "-"}</td>
                  <td className="px-4 py-3">
                    {milestone.owner?.name ?? "-"}
                  </td>
                  {canEdit ? (
                    <td className="px-4 py-3">
                      <form
                        action={deleteCommercialMilestone.bind(
                          null,
                          milestone.id,
                        )}
                      >
                        <button className="text-xs font-medium text-rose-700 hover:underline">
                          Eliminar
                        </button>
                      </form>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
