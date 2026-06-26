import { CalendarMeetingArtifactType, CalendarMeetingStatus, UserRole } from "@prisma/client";
import Link from "next/link";

import { auth } from "@/auth";
import { MeetingContextForm } from "@/components/meetings/meeting-context-form";
import { MeetingInteractionForm } from "@/components/meetings/meeting-interaction-form";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  analyzeMeetingWithAi,
  createInteractionFromMeeting,
  deleteMeeting,
  discoverMeetingArtifacts,
  ignoreMeeting,
  importMeetingArtifactText,
  syncMeetMeetings,
  updateMeetingContext,
} from "@/server/actions/calendar";

export const dynamic = "force-dynamic";

const DEFAULT_MEETING_NEXT_ACTION = "Revisar estado de Oportunidad y actualizar si fuese necesario";

const statusLabels: Record<CalendarMeetingStatus, string> = {
  SCHEDULED: "Programada",
  COMPLETED: "Realizada",
  MINUTES_PENDING: "Minuta pendiente",
  ANALYZED: "Analizada",
  IMPORTED: "Importada",
  IGNORED: "Descartada",
};

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; showIgnored?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const selectedStatus = Object.values(CalendarMeetingStatus).includes(
    params?.status as CalendarMeetingStatus,
  )
    ? (params?.status as CalendarMeetingStatus)
    : undefined;
  const showIgnored = params?.showIgnored === "on";
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
              ...(selectedStatus
                ? { status: selectedStatus }
                : !showIgnored
                  ? { status: { not: CalendarMeetingStatus.IGNORED } }
                  : {}),
            },
            include: {
              company: true,
              contact: true,
              opportunity: true,
              service: true,
              importedInteraction: true,
              artifacts: true,
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

      <form className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-white p-4">
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
        <label className="flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm">
          <input defaultChecked={showIgnored} name="showIgnored" type="checkbox" />
          Mostrar descartadas
        </label>
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

            {meeting.status === CalendarMeetingStatus.IGNORED ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {canEdit ? (
                  <form action={deleteMeeting.bind(null, meeting.id)}>
                    <SubmitButton pendingLabel="Eliminando" size="sm" variant="outline">
                      Eliminar
                    </SubmitButton>
                  </form>
                ) : null}
              </div>
            ) : null}

            <details className="mt-3 group">
              <summary className="cursor-pointer text-sm font-medium text-teal-700">
                Completar datos de la reunion
              </summary>

            <div className="mt-3 flex flex-wrap gap-2">
              {canEdit ? (
                <form action={discoverMeetingArtifacts.bind(null, meeting.id)}>
                  <SubmitButton pendingLabel="Buscando" size="sm" variant="outline">
                    Buscar artefactos Meet
                  </SubmitButton>
                </form>
              ) : null}
              {canEdit && meeting.minutes && meeting.status !== CalendarMeetingStatus.ANALYZED ? (
                <form action={analyzeMeetingWithAi.bind(null, meeting.id)}>
                  <SubmitButton pendingLabel="Analizando" size="sm" variant="outline">
                    Analizar con IA
                  </SubmitButton>
                </form>
              ) : null}
            </div>

            {meeting.lastDiscoveryError ? (
              <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {meeting.lastDiscoveryError}
              </p>
            ) : null}

            {meeting.artifacts.length ? (
              <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Artefactos Meet</p>
                <div className="mt-2 space-y-2">
                  {meeting.artifacts.map((artifact) => (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white px-3 py-2 text-sm" key={artifact.id}>
                      <div>
                        <p className="font-medium">
                          {artifact.type === CalendarMeetingArtifactType.TRANSCRIPT
                            ? "Transcripcion"
                            : artifact.type === CalendarMeetingArtifactType.SMART_NOTES
                              ? "Smart notes"
                              : "Grabacion"}
                        </p>
                        <p className="text-xs text-slate-500">{artifact.status}</p>
                        {artifact.lastError ? (
                          <p className="mt-1 text-xs text-rose-700">{artifact.lastError}</p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        {artifact.exportUri ? (
                          <Button asChild size="sm" variant="outline">
                            <a href={artifact.exportUri} rel="noreferrer" target="_blank">
                              Abrir
                            </a>
                          </Button>
                        ) : null}
                        {canEdit &&
                        (artifact.type === CalendarMeetingArtifactType.TRANSCRIPT ||
                          artifact.type === CalendarMeetingArtifactType.SMART_NOTES) ? (
                          <form action={importMeetingArtifactText.bind(null, artifact.id)}>
                            <SubmitButton pendingLabel="Importando" size="sm" variant="outline">
                              Importar texto
                            </SubmitButton>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <MeetingContextForm
              action={updateMeetingContext.bind(null, meeting.id)}
              canEdit={canEdit && !meeting.importedInteractionId}
              companies={companies}
              contacts={contacts}
              defaults={{
                companyId: meeting.companyId,
                contactId: meeting.contactId,
                opportunityId: meeting.opportunityId,
                serviceId: meeting.serviceId,
                minutes: meeting.minutes,
              }}
              opportunities={opportunities}
              services={services}
            />

            {canEdit && !meeting.importedInteractionId ? (
              meeting.minutes && (meeting.companyId || meeting.contactId || meeting.opportunityId) ? (
                <MeetingInteractionForm
                  action={createInteractionFromMeeting.bind(null, meeting.id)}
                  companyId={meeting.companyId}
                  contactId={meeting.contactId}
                  defaultNextAction={DEFAULT_MEETING_NEXT_ACTION}
                  ignoreAction={ignoreMeeting.bind(null, meeting.id)}
                  minutes={meeting.minutes}
                  opportunityId={meeting.opportunityId}
                  serviceId={meeting.serviceId}
                />
              ) : (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <p>
                    Para crear la interaccion, primero asocia la reunion a una empresa, contacto u
                    oportunidad y guarda una minuta.
                  </p>
                  <form action={ignoreMeeting.bind(null, meeting.id)}>
                    <SubmitButton pendingLabel="Descartando" size="sm" variant="outline">
                      Descartar
                    </SubmitButton>
                  </form>
                </div>
              )
            ) : null}
            </details>
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

