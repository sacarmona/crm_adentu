import { ArrowRight, CheckCircle2, Database, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

const foundations = [
  "Next.js App Router + TypeScript",
  "Tailwind CSS + shadcn/ui preparado",
  "Prisma ORM apuntando a PostgreSQL",
  "Estructura modular para servicios y schemas",
];

const nextSteps = [
  "Conectar vistas CRM a datos reales",
  "Implementar permisos por accion y modulo",
  "Construir CRUD de empresas, contactos y oportunidades",
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="rounded-md border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Fase 2 en desarrollo
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">
              CRM ADENTU con sesion protegida y roles base
            </h1>
            <p className="mt-3 text-base leading-7 text-slate-600">
              El acceso interno ya pasa por Auth.js, usando usuarios del schema
              Prisma y roles Admin, Comercial y Lectura.
            </p>
          </div>
          <Button>
            Continuar al CRUD
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-white p-5">
          <Database className="h-5 w-5 text-slate-600" />
          <h2 className="mt-4 text-base font-semibold">Prisma Adapter</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Auth.js queda integrado al modelo de usuarios y preparado para
            proveedores adicionales.
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-5">
          <ShieldCheck className="h-5 w-5 text-slate-600" />
          <h2 className="mt-4 text-base font-semibold">Roles</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            La sesion expone el rol para aplicar permisos por modulo y accion.
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-5">
          <CheckCircle2 className="h-5 w-5 text-slate-600" />
          <h2 className="mt-4 text-base font-semibold">Proteccion</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Las rutas internas redirigen a login cuando no existe una sesion
            valida.
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
  );
}

