import { InteractionType, UserRole } from "@prisma/client";
import { ExternalLink, Share2 } from "lucide-react";
import Link from "next/link";

import { auth } from "@/auth";
import { EntityHeader } from "@/components/crm/entity-header";
import { LinkedInCaptureForm } from "@/components/linkedin/capture-form";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  analyzeLinkedInProfilePdf,
  createLinkedInCapture,
} from "@/server/actions/linkedin";
import { isActiveProviderConfigured } from "@/server/services/ai-provider";

export const dynamic = "force-dynamic";

function sourceUrl(content: string) {
  const match = content.match(/^Fuente:\s+(https:\/\/\S+)/m);
  return match?.[1];
}

export default async function LinkedInPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const canEdit = session?.user.role !== UserRole.LECTURA;
  const aiAvailable = canEdit && (await isActiveProviderConfigured());
  const [companies, contacts, opportunities, services, interactions] =
    await Promise.all([
      prisma.company.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.contact.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.opportunity.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.service.findMany({
        where: { deletedAt: null, isActive: true },
        select: { id: true, name: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.interaction.findMany({
        where: { deletedAt: null, type: InteractionType.LINKEDIN },
        include: { company: true, contact: true, opportunity: true },
        orderBy: { date: "desc" },
        take: 30,
      }),
    ]);

  return (
    <div className="space-y-5">
      <EntityHeader
        description="Registra manualmente conversaciones, publicaciones o senales comerciales observadas en LinkedIn."
        title="LinkedIn"
      />
      {params?.created ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Captura registrada como interaccion comercial.
        </div>
      ) : null}
      <div className="rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        El CRM no consulta LinkedIn ni extrae perfiles automaticamente. Registra
        solo informacion que tengas autorizacion para utilizar.
      </div>
      {canEdit ? (
        <LinkedInCaptureForm
          action={createLinkedInCapture}
          aiAvailable={aiAvailable}
          analyzeAction={analyzeLinkedInProfilePdf}
          companies={companies}
          contacts={contacts}
          opportunities={opportunities}
          services={services}
        />
      ) : (
        <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Tu rol permite consultar capturas, pero no registrar nuevas.
        </div>
      )}

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">Capturas recientes</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {interactions.map((interaction) => {
            const url = sourceUrl(interaction.content);
            return (
              <article className="p-4" key={interaction.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 font-medium">
                      <Share2 className="h-4 w-4 text-sky-700" aria-hidden />
                      {interaction.contact?.name ??
                        interaction.company?.name ??
                        "Captura LinkedIn"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(interaction.date)}
                    </p>
                  </div>
                  {url ? (
                    <a
                      className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:underline"
                      href={url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Abrir fuente
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  ) : null}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {interaction.content}
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  {interaction.company ? (
                    <Link
                      className="font-medium hover:underline"
                      href={`/companies/${interaction.company.id}`}
                    >
                      {interaction.company.name}
                    </Link>
                  ) : null}
                  {interaction.opportunity ? (
                    <Link
                      className="font-medium hover:underline"
                      href={`/opportunities/${interaction.opportunity.id}`}
                    >
                      {interaction.opportunity.name}
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}
          {interactions.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">
              Todavia no hay capturas de LinkedIn.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
