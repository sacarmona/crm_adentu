import {
  CalendarMeetingArtifactType,
  type CalendarMeeting,
} from "@prisma/client";

const MEET_API_URL = "https://meet.googleapis.com/v2";

export const MEET_ARTIFACT_SCOPES = [
  "https://www.googleapis.com/auth/meetings.space.readonly",
  "https://www.googleapis.com/auth/drive.meet.readonly",
];

export function meetingArtifactScopesGranted(scope?: string | null) {
  const granted = new Set((scope ?? "").split(/\s+/).filter(Boolean));
  return MEET_ARTIFACT_SCOPES.every((required) => granted.has(required));
}

type MeetConferenceRecord = {
  name?: string;
  startTime?: string;
  endTime?: string;
};

type MeetTranscript = {
  name?: string;
  state?: string;
  docsDestination?: { document?: string; exportUri?: string };
};

type MeetTranscriptEntry = {
  text?: string;
  participant?: string;
  startTime?: string;
};

type MeetRecording = {
  name?: string;
  state?: string;
  driveDestination?: { file?: string; exportUri?: string };
};

type MeetSmartNote = {
  name?: string;
  state?: string;
  docsDestination?: { document?: string; exportUri?: string };
};

export type MeetArtifactCandidate = {
  type: CalendarMeetingArtifactType;
  sourceName: string;
  exportUri?: string;
  driveFileId?: string;
  documentId?: string;
};

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

export async function exportedArtifactText(accessToken: string, exportUri: string) {
  const response = await fetch(exportUri, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Google Meet rechazo la descarga del artefacto (${response.status}).`);
  }
  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  return contentType.includes("html") ? stripHtml(text) : text.trim();
}
function meetingCodeFor(meeting: Pick<CalendarMeeting, "conferenceId" | "meetingUri">) {
  if (meeting.conferenceId) return meeting.conferenceId;
  const match = meeting.meetingUri?.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
  return match?.[1];
}

async function meetJson<T>(accessToken: string, path: string) {
  const response = await fetch(`${MEET_API_URL}/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Google Meet rechazo la solicitud (${response.status}).`);
  }
  return (await response.json()) as T;
}

export async function conferenceRecordForMeeting(
  accessToken: string,
  meeting: Pick<CalendarMeeting, "conferenceId" | "meetingUri" | "startsAt" | "endsAt">,
) {
  const meetingCode = meetingCodeFor(meeting);
  if (!meetingCode) return null;

  const url = new URL(`${MEET_API_URL}/conferenceRecords`);
  url.searchParams.set("pageSize", "10");
  url.searchParams.set("filter", `space.meeting_code = "${meetingCode}"`);

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Google Meet rechazo la busqueda de conferencia (${response.status}).`);
  }

  const payload = (await response.json()) as { conferenceRecords?: MeetConferenceRecord[] };
  const records = payload.conferenceRecords ?? [];
  if (records.length <= 1) return records[0]?.name ?? null;

  const startsAt = meeting.startsAt.getTime();
  return (
    records
      .filter((record) => record.name)
      .map((record) => ({
        name: record.name!,
        distance: Math.abs(new Date(record.startTime ?? 0).getTime() - startsAt),
      }))
      .sort((a, b) => a.distance - b.distance)[0]?.name ?? null
  );
}

export async function listMeetArtifacts(
  accessToken: string,
  conferenceRecordName: string,
): Promise<MeetArtifactCandidate[]> {
  const [transcripts, recordings, smartNotes] = await Promise.all([
    meetJson<{ transcripts?: MeetTranscript[] }>(
      accessToken,
      `${conferenceRecordName}/transcripts?pageSize=100`,
    ).catch(() => ({ transcripts: [] })),
    meetJson<{ recordings?: MeetRecording[] }>(
      accessToken,
      `${conferenceRecordName}/recordings?pageSize=100`,
    ).catch(() => ({ recordings: [] })),
    meetJson<{ smartNotes?: MeetSmartNote[] }>(
      accessToken,
      `${conferenceRecordName}/smartNotes?pageSize=100`,
    ).catch(() => ({ smartNotes: [] })),
  ]);

  return [
    ...(transcripts.transcripts ?? []).flatMap((item): MeetArtifactCandidate[] =>
      item.name
        ? [
            {
              type: CalendarMeetingArtifactType.TRANSCRIPT,
              sourceName: item.name,
              exportUri: item.docsDestination?.exportUri,
              documentId: item.docsDestination?.document,
            },
          ]
        : [],
    ),
    ...(recordings.recordings ?? []).flatMap((item): MeetArtifactCandidate[] =>
      item.name
        ? [
            {
              type: CalendarMeetingArtifactType.RECORDING,
              sourceName: item.name,
              exportUri: item.driveDestination?.exportUri,
              driveFileId: item.driveDestination?.file,
            },
          ]
        : [],
    ),
    ...(smartNotes.smartNotes ?? []).flatMap((item): MeetArtifactCandidate[] =>
      item.name
        ? [
            {
              type: CalendarMeetingArtifactType.SMART_NOTES,
              sourceName: item.name,
              exportUri: item.docsDestination?.exportUri,
              documentId: item.docsDestination?.document,
            },
          ]
        : [],
    ),
  ];
}

export async function transcriptText(accessToken: string, transcriptName: string) {
  const payload = await meetJson<{ transcriptEntries?: MeetTranscriptEntry[] }>(
    accessToken,
    `${transcriptName}/entries?pageSize=1000`,
  );
  const entries = payload.transcriptEntries ?? [];
  return entries
    .map((entry) => {
      const when = entry.startTime ? new Date(entry.startTime).toISOString() : null;
      return [when, entry.participant, entry.text].filter(Boolean).join(" | ");
    })
    .filter(Boolean)
    .join("\n");
}
