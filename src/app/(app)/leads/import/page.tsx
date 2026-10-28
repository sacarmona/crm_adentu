import { UserRole } from "@prisma/client";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LeadImporter } from "@/components/crm/lead-importer";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function LeadImportPage() {
  const session = await auth();
  if (session?.user.role === UserRole.LECTURA) redirect("/leads");

  return (
    <div className="space-y-5">
      <Button asChild className="w-fit" size="sm" variant="outline">
        <Link href="/leads">
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Volver a leads
        </Link>
      </Button>

      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Importar leads</h1>
            <p className="mt-2 text-sm text-slate-600">
              Sube una planilla CSV o Excel. Revisa la vista previa y confirma para incorporar los leads.
            </p>
          </div>
          <Button asChild variant="outline">
            <a href="/api/leads/template" download>
              Descargar plantilla
            </a>
          </Button>
        </div>
      </section>

      <LeadImporter />
    </div>
  );
}
