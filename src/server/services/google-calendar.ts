import { env } from "@/lib/env";
import { decryptEmailToken, encryptEmailToken } from "@/server/services/email-crypto";
import { GOOGLE_DRIVE_MEDIA_SCOPES } from "@/server/services/google-drive";
import { MEET_ARTIFACT_SCOPES } from "@/server/services/google-meet";
import { GOOGLE_TASK_SCOPES } from "@/server/services/google-tasks";

const AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events",
  ...MEET_ARTIFACT_SCOPES,
  ...GOOGLE_TASK_SCOPES,
  ...GOOGLE_DRIVE_MEDIA_SCOPES,
];

// El resto del CRM trata el reloj almacenado en UTC como si fuera la hora
// local de Chile (ver lib/format.ts APP_TIME_ZONE). Reproducimos la misma
// convencion aqui para que el evento muestre la misma hora que el usuario
// ingreso, en lugar de la hora UTC real.
const APP_TIME_ZONE = "Etc/GMT+4";

function toAppLocalDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  );
}

export function isGoogleCalendarConfigured() {
  return Boolean(env.GMAIL_CLIENT_ID && env.GMAIL_CLIENT_SECRET);
}

export function calendarAuthorizationUrl(input: { redirectUri: string; state: string }) {
  if (!env.GMAIL_CLIENT_ID || !env.GMAIL_CLIENT_SECRET) {
    throw new Error("Google Calendar no esta configurado.");
  }
  const url = new URL(AUTHORIZATION_URL);
  url.searchParams.set("client_id", env.GMAIL_CLIENT_ID);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES.join(" "));
  url.searchParams.set("state", input.state);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  return url;
}

export async function exchangeCalendarAuthorizationCode(input: {
  code: string;
  redirectUri: string;
}) {
  if (!env.GMAIL_CLIENT_ID || !env.GMAIL_CLIENT_SECRET) {
    throw new Error("Google Calendar no esta configurado.");
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GMAIL_CLIENT_ID,
      client_secret: env.GMAIL_CLIENT_SECRET,
      code: input.code,
      grant_type: "authorization_code",
      redirect_uri: input.redirectUri,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`OAuth rechazo el codigo (${response.status}).`);
  }

  const token = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
  if (!token.access_token) {
    throw new Error("OAuth no devolvio un token de acceso.");
  }

  return {
    accessToken: token.access_token,
    accessTokenEncrypted: encryptEmailToken(token.access_token),
    refreshTokenEncrypted: token.refresh_token
      ? encryptEmailToken(token.refresh_token)
      : undefined,
    tokenExpiresAt: token.expires_in
      ? new Date(Date.now() + token.expires_in * 1000)
      : undefined,
    scope: token.scope,
  };
}

export async function emailAddressForCalendarToken(accessToken: string) {
  const response = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`No fue posible identificar la cuenta (${response.status}).`);
  }
  const profile = (await response.json()) as { email?: string };
  if (!profile.email) {
    throw new Error("Google no devolvio el correo de la cuenta.");
  }
  return profile.email.toLowerCase();
}

async function refreshCalendarAccessToken(refreshTokenEncrypted: string) {
  if (!env.GMAIL_CLIENT_ID || !env.GMAIL_CLIENT_SECRET) {
    throw new Error("Google Calendar no esta configurado.");
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GMAIL_CLIENT_ID,
      client_secret: env.GMAIL_CLIENT_SECRET,
      refresh_token: decryptEmailToken(refreshTokenEncrypted),
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`No fue posible renovar el acceso (${response.status}).`);
  }

  const token = (await response.json()) as {
    access_token: string;
    expires_in?: number;
  };
  if (!token.access_token) {
    throw new Error("Google no devolvio un token renovado.");
  }

  return {
    accessToken: token.access_token,
    accessTokenEncrypted: encryptEmailToken(token.access_token),
    tokenExpiresAt: token.expires_in
      ? new Date(Date.now() + token.expires_in * 1000)
      : undefined,
  };
}

export async function usableCalendarAccessToken(connection: {
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string | null;
  tokenExpiresAt: Date | null;
}) {
  const stillValid =
    !connection.tokenExpiresAt ||
    connection.tokenExpiresAt.getTime() > Date.now() + 60_000;

  if (stillValid) {
    return { accessToken: decryptEmailToken(connection.accessTokenEncrypted), refreshed: null };
  }

  if (!connection.refreshTokenEncrypted) {
    throw new Error("La autorizacion de calendario expiro. Vuelve a conectarlo.");
  }

  const refreshed = await refreshCalendarAccessToken(connection.refreshTokenEncrypted);
  return { accessToken: refreshed.accessToken, refreshed };
}

export async function createCalendarEvent(
  accessToken: string,
  input: { summary: string; description?: string; start: Date },
) {
  const end = new Date(input.start.getTime() + 30 * 60 * 1000);
  const response = await fetch(EVENTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: input.summary,
      description: input.description,
      start: { dateTime: toAppLocalDateTime(input.start), timeZone: APP_TIME_ZONE },
      end: { dateTime: toAppLocalDateTime(end), timeZone: APP_TIME_ZONE },
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Google Calendar rechazo la creacion del evento (${response.status}).`);
  }
  const event = (await response.json()) as { id: string };
  return event.id;
}

export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  input: { summary: string; description?: string; start: Date },
) {
  const end = new Date(input.start.getTime() + 30 * 60 * 1000);
  const response = await fetch(`${EVENTS_URL}/${eventId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: input.summary,
      description: input.description,
      start: { dateTime: toAppLocalDateTime(input.start), timeZone: APP_TIME_ZONE },
      end: { dateTime: toAppLocalDateTime(end), timeZone: APP_TIME_ZONE },
    }),
    cache: "no-store",
  });
  if (!response.ok && response.status !== 404 && response.status !== 410) {
    throw new Error(`Google Calendar rechazo la actualizacion del evento (${response.status}).`);
  }
}

export async function deleteCalendarEvent(accessToken: string, eventId: string) {
  const response = await fetch(`${EVENTS_URL}/${eventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok && response.status !== 404 && response.status !== 410 && response.status !== 204) {
    throw new Error(`Google Calendar rechazo la eliminacion del evento (${response.status}).`);
  }
}

type CalendarEventAttendee = {
  email?: string;
  displayName?: string;
  responseStatus?: string;
};

type GoogleCalendarEvent = {
  id?: string;
  recurringEventId?: string;
  summary?: string;
  description?: string;
  hangoutLink?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  organizer?: { email?: string };
  attendees?: CalendarEventAttendee[];
  conferenceData?: {
    conferenceId?: string;
    entryPoints?: { entryPointType?: string; uri?: string }[];
  };
};

export type MeetCalendarEvent = {
  providerEventId: string;
  recurringEventId?: string;
  summary: string;
  description?: string;
  meetingUri?: string;
  conferenceId?: string;
  startsAt: Date;
  endsAt?: Date;
  organizerEmail?: string;
  attendees: CalendarEventAttendee[];
};

function parseCalendarDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function meetUriForEvent(event: GoogleCalendarEvent) {
  const entryUri = event.conferenceData?.entryPoints?.find(
    (entryPoint) =>
      entryPoint.entryPointType === "video" &&
      entryPoint.uri?.includes("meet.google.com"),
  )?.uri;
  if (entryUri) return entryUri;
  return event.hangoutLink?.includes("meet.google.com") ? event.hangoutLink : undefined;
}

export async function listMeetCalendarEvents(
  accessToken: string,
  input: { timeMin: Date; timeMax: Date },
) {
  const url = new URL(EVENTS_URL);
  url.searchParams.set("timeMin", input.timeMin.toISOString());
  url.searchParams.set("timeMax", input.timeMax.toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("conferenceDataVersion", "1");
  url.searchParams.set("maxResults", "100");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Google Calendar rechazo la lectura de eventos (${response.status}).`);
  }

  const payload = (await response.json()) as { items?: GoogleCalendarEvent[] };
  return (payload.items ?? []).flatMap((event): MeetCalendarEvent[] => {
    const meetingUri = meetUriForEvent(event);
    const startsAt = parseCalendarDate(event.start?.dateTime ?? event.start?.date);
    if (!event.id || !meetingUri || !startsAt) return [];
    const endsAt = parseCalendarDate(event.end?.dateTime ?? event.end?.date) ?? undefined;
    return [
      {
        providerEventId: event.id,
        recurringEventId: event.recurringEventId,
        summary: event.summary?.trim() || "Reunion sin titulo",
        description: event.description,
        meetingUri,
        conferenceId: event.conferenceData?.conferenceId,
        startsAt,
        endsAt,
        organizerEmail: event.organizer?.email,
        attendees: event.attendees ?? [],
      },
    ];
  });
}
