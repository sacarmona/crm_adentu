import { EmailDiscardRuleType, UserRole } from "@prisma/client";
import { ChevronLeft, ListFilter } from "lucide-react";
import Link from "next/link";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { prisma } from "@/lib/prisma";
import { toggleDiscardRule } from "@/server/actions/email";

export const dynamic = "force-dynamic";

const typeLabels: Record<EmailDiscardRuleType, string> = {
  SENDER_EXACT: "Remitente exacto",
  SENDER_DOMAIN: "Dominio del remitente",
  SUBJECT_CONTAINS: "Asunto contiene",
};

export default async function EmailRulesPage() {
  const session = await auth();
  const canEdit = session?.user.role !== UserRole.LECTURA;
  const rules = session?.user.id
    ? await prisma.emailDiscardRule.findMany({
        where: { userId: session.user.id },
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      })
    : [];

  return (
    <div className="space-y-5">
      <Button asChild size="sm" variant="ghost">
        <Link href="/email">
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Volver a correo
        </Link>
      </Button>
      <div>
        <div className="flex items-center gap-2">
          <ListFilter className="h-5 w-5 text-teal-700" aria-hidden />
          <h1 className="text-2xl font-semibold">Reglas de descarte</h1>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Se aplican antes del analisis de IA. Los mensajes permanecen
          disponibles para restauracion.
        </p>
      </div>
      <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Direccion</th>
              <th className="px-4 py-3">Aplicaciones</th>
              <th className="px-4 py-3">Estado</th>
              {canEdit ? <th className="px-4 py-3">Accion</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td className="px-4 py-3">{typeLabels[rule.type]}</td>
                <td className="px-4 py-3 font-mono text-xs">{rule.value}</td>
                <td className="px-4 py-3">{rule.direction ?? "Ambas"}</td>
                <td className="px-4 py-3">{rule.matchCount}</td>
                <td className="px-4 py-3">
                  {rule.isActive ? "Activa" : "Inactiva"}
                </td>
                {canEdit ? (
                  <td className="px-4 py-3">
                    <form action={toggleDiscardRule.bind(null, rule.id)}>
                      <SubmitButton
                        pendingLabel="Actualizando"
                        size="sm"
                        variant="outline"
                      >
                        {rule.isActive ? "Desactivar" : "Activar"}
                      </SubmitButton>
                    </form>
                  </td>
                ) : null}
              </tr>
            ))}
            {rules.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-10 text-center text-slate-500"
                  colSpan={canEdit ? 6 : 5}
                >
                  Aun no existen reglas. Crea una desde el detalle de un correo.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
