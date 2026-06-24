import { AiProvider, UserRole } from "@prisma/client";
import { BookOpen, Power, Settings2, Wrench } from "lucide-react";
import Link from "next/link";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import {
  toggleDictionaryValue,
  toggleService,
  updateAiProvider,
} from "@/server/actions/settings";
import { getActiveAiProvider } from "@/server/services/ai-provider";
import { isAiConfigured } from "@/server/services/openai";
import { isAnthropicConfigured } from "@/server/services/anthropic";
import { groupDictionaryCounts } from "@/server/services/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string; type?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const view =
    params?.view === "dictionaries"
      ? "dictionaries"
      : params?.view === "ai"
        ? "ai"
        : "services";
  const canEdit = session?.user.role === UserRole.ADMIN;
  const [services, dictionaryValues, activeProvider] = await Promise.all([
    prisma.service.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: {
            opportunities: true,
            interactions: true,
            tasks: true,
            marketAssets: true,
            playbooks: true,
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.dictionaryValue.findMany({
      where: { deletedAt: null },
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { label: "asc" }],
    }),
    getActiveAiProvider(),
  ]);
  const openaiReady = isAiConfigured();
  const anthropicReady = isAnthropicConfigured();
  const dictionaryCounts = groupDictionaryCounts(dictionaryValues);
  const types = Object.keys(dictionaryCounts);
  const selectedType = params?.type || types[0];
  const visibleValues = dictionaryValues.filter(
    (value) => value.type === selectedType,
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Configuracion</h1>
          <p className="mt-1 text-sm text-slate-600">
            Catalogos compartidos que ordenan el uso del CRM.
          </p>
        </div>
        {canEdit ? (
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/settings/audit">Ver auditoria</Link>
            </Button>
            <Button asChild>
              <Link
                href={
                  view === "services"
                    ? "/settings/services/new"
                    : `/settings/dictionaries/new${selectedType ? `?type=${selectedType}` : ""}`
                }
              >
                {view === "services" ? "Nuevo servicio" : "Nuevo valor"}
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      {!canEdit ? (
        <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Puedes consultar los catalogos. Solo ADMIN puede modificarlos.
        </div>
      ) : null}

      <div className="flex gap-1 border-b border-slate-200">
        <Link
          className={`px-4 py-2 text-sm font-medium ${view === "services" ? "border-b-2 border-slate-950" : "text-slate-500"}`}
          href="/settings?view=services"
        >
          Servicios
        </Link>
        <Link
          className={`px-4 py-2 text-sm font-medium ${view === "dictionaries" ? "border-b-2 border-slate-950" : "text-slate-500"}`}
          href="/settings?view=dictionaries"
        >
          Diccionarios
        </Link>
        <Link
          className={`px-4 py-2 text-sm font-medium ${view === "ai" ? "border-b-2 border-slate-950" : "text-slate-500"}`}
          href="/settings?view=ai"
        >
          Inteligencia Comercial
        </Link>
      </div>

      {view === "ai" ? (
        <section className="max-w-xl rounded-md border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Proveedor de IA</h2>
          <p className="mt-1 text-sm text-slate-600">
            Selecciona que proveedor usa el modulo de Inteligencia Comercial
            para analizar interacciones.
          </p>
          <div className="mt-4 space-y-3">
            <ProviderRow
              configured={openaiReady}
              label="OpenAI"
              selected={activeProvider === AiProvider.OPENAI}
            />
            <ProviderRow
              configured={anthropicReady}
              label="Anthropic (Claude)"
              selected={activeProvider === AiProvider.ANTHROPIC}
            />
          </div>
          {canEdit ? (
            <form action={updateAiProvider} className="mt-5 flex flex-wrap gap-3">
              <SelectProvider
                defaultValue={activeProvider}
                disabled={!openaiReady}
                provider={AiProvider.OPENAI}
              />
              <SelectProvider
                defaultValue={activeProvider}
                disabled={!anthropicReady}
                provider={AiProvider.ANTHROPIC}
              />
            </form>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              Solo ADMIN puede cambiar el proveedor activo.
            </p>
          )}
        </section>
      ) : null}

      {view === "services" ? (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <Summary
              icon={Wrench}
              label="Servicios"
              value={services.length}
            />
            <Summary
              icon={Power}
              label="Activos"
              value={services.filter((service) => service.isActive).length}
            />
            <Summary
              icon={Settings2}
              label="Referencias"
              value={services.reduce(
                (sum, service) =>
                  sum +
                  service._count.opportunities +
                  service._count.interactions +
                  service._count.tasks +
                  service._count.marketAssets +
                  service._count.playbooks,
                0,
              )}
            />
          </section>
          <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Orden</th>
                  <th className="px-4 py-3">Servicio</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Referencias</th>
                  {canEdit ? <th className="px-4 py-3">Acciones</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {services.map((service) => {
                  const references =
                    service._count.opportunities +
                    service._count.interactions +
                    service._count.tasks +
                    service._count.marketAssets +
                    service._count.playbooks;
                  return (
                    <tr key={service.id}>
                      <td className="px-4 py-3">{service.sortOrder}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{service.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {service.description ?? service.slug}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Status active={service.isActive} />
                      </td>
                      <td className="px-4 py-3">{references}</td>
                      {canEdit ? (
                        <td className="px-4 py-3">
                          <div className="flex gap-3">
                            <Link
                              className="text-xs font-medium hover:underline"
                              href={`/settings/services/${service.id}/edit`}
                            >
                              Editar
                            </Link>
                            <form action={toggleService.bind(null, service.id)}>
                              <button className="text-xs font-medium text-slate-600 hover:underline">
                                {service.isActive ? "Desactivar" : "Activar"}
                              </button>
                            </form>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </>
      ) : null}

      {view === "dictionaries" ? (
        <section className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <aside className="space-y-1">
            {types.map((type) => (
              <Link
                className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${type === selectedType ? "bg-slate-950 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}
                href={`/settings?view=dictionaries&type=${type}`}
                key={type}
              >
                <span>{type}</span>
                <span className="text-xs">
                  {dictionaryCounts[type].active}/{dictionaryCounts[type].total}
                </span>
              </Link>
            ))}
          </aside>
          <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Orden</th>
                  <th className="px-4 py-3">Clave</th>
                  <th className="px-4 py-3">Etiqueta</th>
                  <th className="px-4 py-3">Estado</th>
                  {canEdit ? <th className="px-4 py-3">Acciones</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleValues.map((value) => (
                  <tr key={value.id}>
                    <td className="px-4 py-3">{value.sortOrder}</td>
                    <td className="px-4 py-3 font-mono text-xs">{value.key}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{value.label}</p>
                      {value.description ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {value.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <Status active={value.isActive} />
                    </td>
                    {canEdit ? (
                      <td className="px-4 py-3">
                        <div className="flex gap-3">
                          <Link
                            className="text-xs font-medium hover:underline"
                            href={`/settings/dictionaries/${value.id}/edit`}
                          >
                            Editar
                          </Link>
                          <form
                            action={toggleDictionaryValue.bind(null, value.id)}
                          >
                            <button className="text-xs font-medium text-slate-600 hover:underline">
                              {value.isActive ? "Desactivar" : "Activar"}
                            </button>
                          </form>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
                {visibleValues.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-8 text-center text-slate-500"
                      colSpan={canEdit ? 5 : 4}
                    >
                      No hay valores en este diccionario.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Status({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-md px-2 py-1 text-xs font-semibold ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
    >
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}

function Summary({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof BookOpen;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <Icon className="h-5 w-5 text-teal-700" aria-hidden="true" />
      <p className="mt-3 text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ProviderRow({
  label,
  selected,
  configured,
}: {
  label: string;
  selected: boolean;
  configured: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="font-medium">{label}</span>
        {selected ? (
          <span className="rounded-md bg-slate-950 px-2 py-0.5 text-xs font-semibold text-white">
            Activo
          </span>
        ) : null}
      </div>
      <span
        className={`text-xs font-medium ${configured ? "text-emerald-700" : "text-rose-700"}`}
      >
        {configured ? "Configurado" : "Sin API key"}
      </span>
    </div>
  );
}

function SelectProvider({
  provider,
  defaultValue,
  disabled,
}: {
  provider: AiProvider;
  defaultValue: AiProvider;
  disabled: boolean;
}) {
  const isCurrent = provider === defaultValue;
  return (
    <button
      className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        isCurrent
          ? "border-slate-950 bg-slate-950 text-white"
          : "border-slate-300 bg-white text-slate-950 hover:bg-slate-50"
      }`}
      disabled={disabled}
      name="provider"
      type="submit"
      value={provider}
    >
      Usar {provider === "OPENAI" ? "OpenAI" : "Anthropic"}
    </button>
  );
}
