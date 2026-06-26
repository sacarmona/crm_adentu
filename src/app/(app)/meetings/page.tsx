import { CalendarMeetingStatus, UserRole } from "@prisma/client";
import Link from "next/link";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  createInteractionFromMeeting,
  ignoreMeeting,
  syncMeetMeetings,
  updateMeetingContext,
} from "@/server/actions/calendar";

export const dynamic = "force-dynamic";

const statusLabels: Record<CalendarMeetingStatus, string> = {
  SCHEDULED: "Programada",
  COMPLETED: "Realizada",
  IMPORTED: "Importada",
  IGNORED: "Descartada",
};

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const selectedStatus = Object.values(CalendarMeetingStatus).includes(
    params?.status as CalendarMeetingStatus,
  )
    ? (params?.status as CalendarMeetingStatus)
    : undefined;
  const canEdit = session?.user.role !== UserRole.LECTURA;
  const userId = session?.user.id;
  const [calendarConnection, meetings, companies, contacts, opportunities, services] =
    await Promise.all([
      userId
        ? prisma.calendarConnection.findUnique({ where: { userId } })
        : Promise.resolve(null),
      userId
        ? prisma.calendarMeeting.findMany({
            where: {
              userId,
              ...(selectedStatus ? { status: selectedStatus } : {}),
            },
            include: {
              company: true,
              contact: true,
              opportunity: true,
              service: true,
              importedInteraction: true,
            },
            orderBy: { startsAt: "desc" },
            take: 50,
          })
        : Promise.resolve([]),
      prisma.company.findMany({
        where: { deletedAt: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.contact.findMany({
        where: { deletedAt: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true, companyId: true },
      }),
      prisma.opportunity.findMany({
        where: { deletedAt: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true, companyId: true },
      }),
      prisma.service.findMany({
        where: { deletedAt: null, isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Reuniones</h1>
          <p className="mt-1 text-sm text-slate-600">
            Sincroniza reuniones Google Meet, registra minutas y conviertelas en interacciones comerciales.
          </p>
        </div>
        {canEdit && calendarConnection ? (
          <form action={syncMeetMeetings}>
            <SubmitButton pendingLabel="Sincronizando">Sincronizar Meet</SubmitButton>
          </form>
        ) : null}
      </div>

      {!calendarConnection ? (
        <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Conecta Google Calendar en{" "}
          <Link className="font-medium underline" href="/settings?view=calendar">
            Configuracion
          </Link>{" "}
          para importar reuniones Meet.
        </section>
      ) : null}

      <form className="flex flex-wrap gap-3 rounded-md border border-slate-200 bg-white p-4">
        <select
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
          defaultValue={selectedStatus ?? ""}
          name="status"
        >
          <option value="">Todos los estados</option>
          {Object.values(CalendarMeetingStatus).map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </select>
        <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white">
          Filtrar
        </button>
      </form>

      <section className="space-y-3">
        {meetings.map((meeting) => (
          <article
            className="rounded-md border border-slate-200 bg-white p-4"
            key={meeting.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold">{meeting.summary}</h2>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    {statusLabels[meeting.status]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {formatDateTime(meeting.startsAt)}
                  {meeting.organizerEmail ? ` - ${meeting.organizerEmail}` : ""}
                </p>
                {meeting.meetingUri ? (
                  <a
                    className="mt-1 inline-block text-sm font-medium text-teal-700 hover:underline"
                    href={meeting.meetingUri}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Abrir Meet
                  </a>
                ) : null}
              </div>
              {meeting.importedInteractionId ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/interactions?created=${meeting.importedInteractionId}`}>
                    Ver interaccion
                  </Link>
                </Button>
              ) : null}
            </div>

            <form
              action={updateMeetingContext.bind(null, meeting.id)}
              className="mt-4 grid gap-3 lg:grid-cols-4"
            >
              <SelectBox
                defaultValue={meeting.companyId}
                label="Empresa"
                name="companyId"
                options={companies}
              />
              <SelectBox
                defaultValue={meeting.contactId}
                label="Contacto"
                name="contactId"
                options={contacts}
              />
              <SelectBox
                defaultValue={meeting.opportunityId}
                label="Oportunidad"
                name="opportunityId"
                options={opportunities}
              />
              <SelectBox
                defaultValue={meeting.serviceId}
                label="Servicio"
                name="serviceId"
                options={services}
              />
              <label className="lg:col-span-4">
                <span className="text-xs font-medium text-slate-600">Minuta</span>
                <textarea
                  className="mt-1 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  defaultValue={meeting.minutes ?? ""}
                  name="minutes"
                  placeholder="Acuerdos, necesidades detectadas, objeciones, proximos pasos..."
                />
              </label>
              {canEdit && !meeting.importedInteractionId ? (
                <div className="flex flex-wrap gap-2 lg:col-span-4">
                  <SubmitButton pendingLabel="Guardando" size="sm" variant="outline">
                    Guardar minuta
                  </SubmitButton>
                </div>
              ) : null}
            </form>

            {canEdit && !meeting.importedInteractionId ? (
              <form
                action={createInteractionFromMeeting.bind(null, meeting.id)}
                className="mt-3 grid gap-3 border-t border-slate-100 pt-3 lg:grid-cols-[1fr_220px_auto_auto]"
              >
                <input type="hidden" name="companyId" value={meeting.companyId ?? ""} />
                <input type="hidden" name="contactId" value={meeting.contactId ?? ""} />
                <input type="hidden" name="opportunityId" value={meeting.opportunityId ?? ""} />
                <input type="hidden" name="serviceId" value={meeting.serviceId ?? ""} />
                <input type="hidden" name="minutes" value={meeting.minutes ?? ""} />
                <input
                  className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                  name="nextAction"
                  placeholder="Proxima accion opcional"
                />
                <input
                  className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                  name="nextActionDate"
                  type="datetime-local"
                />
                <SubmitButton pendingLabel="Importando">Crear interaccion</SubmitButton>
                <Button
                  formAction={ignoreMeeting.bind(null, meeting.id)}
                  type="submit"
                  variant="outline"
                >
                  Descartar
                </Button>
              </form>
            ) : null}
          </article>
        ))}
        {meetings.length === 0 ? (
          <div className="rounded-md border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No hay reuniones para mostrar. Sincroniza Calendar para buscar eventos con enlace Google Meet.
          </div>
        ) : null}
      </section>
    </div>
  );
}

function SelectBox({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  options: { id: string; name: string }[];
}) {
  return (
    <label>
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <select
        className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
        defaultValue={defaultValue ?? ""}
        name={name}
      >
        <option value="">Sin asociar</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}
