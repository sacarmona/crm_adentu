import { UserRole } from "@prisma/client";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { EntityHeader } from "@/components/crm/entity-header";
import { MarketAssetForm } from "@/components/market/forms";
import { prisma } from "@/lib/prisma";
import { updateMarketAsset } from "@/server/actions/market";

export const dynamic = "force-dynamic";

export default async function EditMarketAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (session?.user.role === UserRole.LECTURA) redirect("/market");
  const { id } = await params;
  const [asset, companies, services] = await Promise.all([
    prisma.marketAsset.findFirst({ where: { id, deletedAt: null } }),
    prisma.company.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.service.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  if (!asset) notFound();

  return (
    <div className="space-y-5">
      <EntityHeader
        description="Actualiza empresas participantes, cantidades y contexto comercial."
        title={`Editar ${asset.unitName}`}
      />
      <MarketAssetForm
        action={updateMarketAsset.bind(null, asset.id)}
        asset={asset}
        companies={companies}
        services={services}
      />
    </div>
  );
}
