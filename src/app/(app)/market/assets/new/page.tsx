import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { EntityHeader } from "@/components/crm/entity-header";
import { MarketAssetForm } from "@/components/market/forms";
import { prisma } from "@/lib/prisma";
import { createMarketAsset } from "@/server/actions/market";

export const dynamic = "force-dynamic";

export default async function NewMarketAssetPage() {
  const session = await auth();
  if (session?.user.role === UserRole.LECTURA) redirect("/market");

  const [companies, services] = await Promise.all([
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

  return (
    <div className="space-y-5">
      <EntityHeader
        description="Registra una unidad del mercado, sus empresas participantes y el servicio potencial."
        title="Nuevo activo de mercado"
      />
      <MarketAssetForm
        action={createMarketAsset}
        companies={companies}
        services={services}
      />
    </div>
  );
}
