import { UserRole } from "@prisma/client";
import { Building2, HardHat, Settings2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { deleteMarketAsset } from "@/server/actions/market";
import { marketAssetCoverage } from "@/server/services/market";

export const dynamic = "force-dynamic";

export default async function MarketAssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;
  const asset = await prisma.marketAsset.findFirst({
    where: { id, deletedAt: null },
    include: {
      service: true,
      ownerCompany: true,
      constructionCompanyRef: true,
      omCompany: true,
    },
  });

  if (!asset) notFound();
  const canEdit = session?.user.role !== UserRole.LECTURA;

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Activo de mercado
            </p>
            <h1 className="mt-1 text-2xl font-semibold">{asset.unitName}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {asset.service?.name ?? "Sin servicio sugerido"} ·{" "}
              {asset.quantity} unidad(es)
            </p>
          </div>
          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href={`/market/assets/${asset.id}/opportunity`}>
                  Crear oportunidad
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/market/assets/${asset.id}/edit`}>Editar</Link>
              </Button>
              <form action={deleteMarketAsset.bind(null, asset.id)}>
                <Button type="submit" variant="secondary">
                  Eliminar
                </Button>
              </form>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <RoleCard
          icon={Building2}
          label="Propietario"
          linkedCompanyId={asset.ownerCompany?.id}
          value={asset.ownerCompany?.name ?? asset.ownerName}
        />
        <RoleCard
          icon={HardHat}
          label="Constructora"
          linkedCompanyId={asset.constructionCompanyRef?.id}
          value={
            asset.constructionCompanyRef?.name ?? asset.constructionCompany
          }
        />
        <RoleCard
          icon={Settings2}
          label="Operacion y mantenimiento"
          linkedCompanyId={asset.omCompany?.id}
          value={asset.omCompany?.name ?? asset.operationMaintenance}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Contexto comercial</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {asset.comment ?? "Sin comentarios registrados."}
          </p>
          {asset.otherRole ? (
            <p className="mt-4 text-sm">
              <span className="font-medium">Otro rol:</span> {asset.otherRole}
            </p>
          ) : null}
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500">Cobertura de relaciones</p>
          <p className="mt-2 text-2xl font-semibold">
            {marketAssetCoverage(asset)}/3
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Roles vinculados a empresas del CRM para navegar y activar acciones
            comerciales.
          </p>
          <p className="mt-4 text-xs text-slate-500">
            Actualizado {formatDateTime(asset.updatedAt)}
          </p>
        </div>
      </section>
    </div>
  );
}

function RoleCard({
  label,
  value,
  linkedCompanyId,
  icon: Icon,
}: {
  label: string;
  value?: string | null;
  linkedCompanyId?: string;
  icon: typeof Building2;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <Icon className="h-5 w-5 text-teal-700" aria-hidden="true" />
      <p className="mt-3 text-xs text-slate-500">{label}</p>
      {linkedCompanyId ? (
        <Link
          className="mt-1 block font-semibold hover:underline"
          href={`/companies/${linkedCompanyId}`}
        >
          {value}
        </Link>
      ) : (
        <p className="mt-1 font-semibold">{value ?? "Sin informacion"}</p>
      )}
    </div>
  );
}
