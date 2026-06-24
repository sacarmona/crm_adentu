import { UserRole } from "@prisma/client";
import { BookOpenCheck } from "lucide-react";
import Link from "next/link";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PlaybooksPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; serviceId?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const q = params?.q?.trim();
  const serviceId = params?.serviceId || undefined;
  const canEdit = session?.user.role !== UserRole.LECTURA;
  const [playbooks, services] = await Promise.all([
    prisma.playbook.findMany({
      where: {
        deletedAt: null,
        ...(serviceId ? { serviceId } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        service: true,
        createdBy: true,
        _count: { select: { items: true } },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
    prisma.service.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Playbooks comerciales</h1>
          <p className="mt-1 text-sm text-slate-600">
            Guias por servicio para calificar, responder objeciones y preparar
            propuestas.
          </p>
        </div>
        {canEdit ? (
          <Button asChild>
            <Link href="/playbooks/new">Nuevo playbook</Link>
          </Button>
        ) : null}
      </div>

      <form className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-[1fr_240px_auto]">
        <input
          className="h-10 rounded-md border border-slate-300 px-3 text-sm"
          defaultValue={q}
          name="q"
          placeholder="Buscar playbook"
        />
        <select
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
          defaultValue={serviceId ?? ""}
          name="serviceId"
        >
          <option value="">Todos los servicios</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {playbooks.map((playbook) => (
          <article
            className="rounded-md border border-slate-200 bg-white p-4"
            key={playbook.id}
          >
            <div className="flex items-start justify-between gap-3">
              <BookOpenCheck
                className="h-5 w-5 text-teal-700"
                aria-hidden="true"
              />
              <span
                className={`rounded-md px-2 py-1 text-xs font-semibold ${playbook.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
              >
                {playbook.isActive ? "Activo" : "Inactivo"}
              </span>
            </div>
            <Link
              className="mt-3 block font-semibold hover:underline"
              href={`/playbooks/${playbook.id}`}
            >
              {playbook.name}
            </Link>
            <p className="mt-1 text-sm text-slate-500">
              {playbook.service?.name ?? "General"}
            </p>
            <p className="mt-3 line-clamp-2 text-sm text-slate-600">
              {playbook.description ?? "Sin descripcion."}
            </p>
            <div className="mt-4 flex justify-between text-xs text-slate-500">
              <span>{playbook._count.items} elementos</span>
              <span>{playbook.createdBy?.name ?? "Sin autor"}</span>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
