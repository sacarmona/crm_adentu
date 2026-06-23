import { ArrowRight, CheckCircle2, Database, ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

const foundations = [
  "Next.js App Router + TypeScript",
  "Tailwind CSS + shadcn/ui preparado",
  "Prisma ORM apuntando a PostgreSQL",
  "Estructura modular para servicios y schemas",
];

const nextSteps = [
  "Completar schema Prisma CRM en Fase 1",
  "Agregar migraciones y seed con datos ficticios",
  "Implementar autenticacion y roles",
];

export default function Home() {
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="rounded-md border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Fase 0 iniciada
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal">
                CRM ADENTU listo para construir el nucleo comercial
              </h1>
              <p className="mt-3 text-base leading-7 text-slate-600">
                Esta base deja preparado el proyecto, el layout operativo, las
                dependencias principales y la conexion esperada a PostgreSQL
                mediante Prisma.
              </p>
            </div>
            <Button>
              Continuar a Fase 1
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-md border border-slate-200 bg-white p-5">
            <Database className="h-5 w-5 text-slate-600" />
            <h2 className="mt-4 text-base font-semibold">Datos</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Prisma queda apuntando a PostgreSQL con un modelo inicial de
              usuario para validar configuracion.
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-5">
            <ShieldCheck className="h-5 w-5 text-slate-600" />
            <h2 className="mt-4 text-base font-semibold">Roles</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              La base contempla Admin, Comercial y Lectura para implementar
              permisos en la siguiente etapa.
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-5">
            <CheckCircle2 className="h-5 w-5 text-slate-600" />
            <h2 className="mt-4 text-base font-semibold">UI</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Sidebar, breadcrumbs, modulos y componentes base quedan alineados
              con el uso comercial del CRM.
            </p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold">Base instalada</h2>
            <ul className="mt-4 space-y-3">
              {foundations.map((item) => (
                <li className="flex gap-3 text-sm text-slate-700" key={item}>
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold">Siguientes pasos</h2>
            <ul className="mt-4 space-y-3">
              {nextSteps.map((item) => (
                <li className="flex gap-3 text-sm text-slate-700" key={item}>
                  <ArrowRight className="mt-0.5 h-4 w-4 flex-none text-slate-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
