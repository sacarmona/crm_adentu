import { UserRole } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { PlaybookGuide } from "@/components/playbooks/playbook-guide";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import {
  deletePlaybook,
  deletePlaybookItem,
} from "@/server/actions/playbooks";

export const dynamic = "force-dynamic";

export default async function PlaybookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;
  const playbook = await prisma.playbook.findFirst({
    where: { id, deletedAt: null },
    include: {
      service: true,
      createdBy: true,
      items: {
        where: { deletedAt: null },
        orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
      },
    },
  });
  if (!playbook) notFound();
  const canEdit = session?.user.role !== UserRole.LECTURA;

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">
              {playbook.service?.name ?? "Playbook general"} ·{" "}
              {playbook.isActive ? "Activo" : "Inactivo"}
            </p>
            <h1 className="mt-1 text-2xl font-semibold">{playbook.name}</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              {playbook.description ?? "Sin descripcion."}
            </p>
          </div>
          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href={`/playbooks/${playbook.id}/items/new`}>
                  Nuevo elemento
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/playbooks/${playbook.id}/edit`}>Editar</Link>
              </Button>
              <form action={deletePlaybook.bind(null, playbook.id)}>
                <Button type="submit" variant="secondary">
                  Eliminar
                </Button>
              </form>
            </div>
          ) : null}
        </div>
      </section>

      <PlaybookGuide items={playbook.items} />

      {canEdit && playbook.items.length > 0 ? (
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="font-semibold">Administrar elementos</h2>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Orden</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Titulo</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {playbook.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">{item.sortOrder}</td>
                  <td className="px-4 py-3">{item.type}</td>
                  <td className="px-4 py-3 font-medium">{item.title}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <Link
                        className="text-xs font-medium hover:underline"
                        href={`/playbooks/items/${item.id}/edit`}
                      >
                        Editar
                      </Link>
                      <form action={deletePlaybookItem.bind(null, item.id)}>
                        <button className="text-xs font-medium text-rose-700 hover:underline">
                          Eliminar
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
