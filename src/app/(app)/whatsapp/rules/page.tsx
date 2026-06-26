import { UserRole } from "@prisma/client";
import { ListFilter } from "lucide-react";

import { auth } from "@/auth";
import { BackLink } from "@/components/ui/back-link";
import { SubmitButton } from "@/components/ui/submit-button";
import { prisma } from "@/lib/prisma";
import { toggleWhatsAppDiscardRule } from "@/server/actions/whatsapp";

export const dynamic = "force-dynamic";

export default async function WhatsAppRulesPage() {
  const session = await auth();
  const canEdit = session?.user.role !== UserRole.LECTURA;
  const rules = await prisma.whatsAppDiscardRule.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-5">
      <BackLink fallbackHref="/whatsapp" label="Volver a WhatsApp" />
      <div>
        <div className="flex items-center gap-2">
          <ListFilter className="h-5 w-5 text-emerald-700" aria-hidden />
          <h1 className="text-2xl font-semibold">Numeros descartados</h1>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Los mensajes nuevos de un numero descartado se marcan como
          ignorados automaticamente, sin pasar por la bandeja de pendientes.
        </p>
      </div>
      <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Numero</th>
              <th className="px-4 py-3">Aplicaciones</th>
              <th className="px-4 py-3">Estado</th>
              {canEdit ? <th className="px-4 py-3">Accion</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td className="px-4 py-3 font-mono text-xs">{rule.phoneNumber}</td>
                <td className="px-4 py-3">{rule.matchCount}</td>
                <td className="px-4 py-3">{rule.isActive ? "Activa" : "Inactiva"}</td>
                {canEdit ? (
                  <td className="px-4 py-3">
                    <form action={toggleWhatsAppDiscardRule.bind(null, rule.id)}>
                      <SubmitButton pendingLabel="Actualizando" size="sm" variant="outline">
                        {rule.isActive ? "Desactivar" : "Activar"}
                      </SubmitButton>
                    </form>
                  </td>
                ) : null}
              </tr>
            ))}
            {rules.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-slate-500" colSpan={canEdit ? 4 : 3}>
                  Aun no existen numeros descartados. Crea uno desde un mensaje pendiente en
                  WhatsApp.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
