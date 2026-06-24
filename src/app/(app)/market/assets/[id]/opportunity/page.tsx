import { UserRole } from "@prisma/client";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { EntityHeader } from "@/components/crm/entity-header";
import { MarketOpportunityForm } from "@/components/market/forms";
import { prisma } from "@/lib/prisma";
import { createOpportunityFromMarket } from "@/server/actions/market";
import { buildMarketOpportunityName } from "@/server/services/market";

export const dynamic = "force-dynamic";

export default async function MarketOpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (session?.user.role === UserRole.LECTURA) redirect("/market");
  const { id } = await params;
  const [asset, companies, services, users] = await Promise.all([
    prisma.marketAsset.findFirst({
      where: { id, deletedAt: null },
      include: { service: true },
    }),
    prisma.company.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.service.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!asset) notFound();

  return (
    <div className="space-y-5">
      <EntityHeader
        description="Convierte la senal de mercado en una oportunidad de exploracion con trazabilidad de origen."
        title="Crear oportunidad desde mercado"
      />
      <MarketOpportunityForm
        action={createOpportunityFromMarket}
        companies={companies}
        defaults={{
          assetId: asset.id,
          name: buildMarketOpportunityName({
            unitName: asset.unitName,
            serviceName: asset.service?.name,
          }),
          companyId: asset.ownerCompanyId,
          serviceId: asset.serviceId,
          quantity: asset.quantity.toString(),
          notes: `Oportunidad originada desde activo de mercado: ${asset.unitName}.${asset.comment ? ` ${asset.comment}` : ""}`,
          responsibleId: session?.user.id,
        }}
        services={services}
        users={users}
      />
    </div>
  );
}
