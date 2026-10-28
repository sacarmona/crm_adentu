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
        <h1 className="text-2xl font-semibold">Importar leads</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sube una planilla CSV o Excel. Revisa la vista previa y confirma para incorporar los leads.
        </p>
      </section>

      <LeadImporter />
    </div>
  );
}
