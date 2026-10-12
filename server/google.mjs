/**
 * Google Calendar over plain REST (no SDK). Uses an OAuth refresh token for the calendar owner,
 * created once with `npm run google:auth`.
 *
 *   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN   required to enable the integration
 *   GOOGLE_CALENDAR_ID                                               default "primary"
 *   GOOGLE_TOKEN_URL / GOOGLE_API_BASE                               overrides, only for tests with a fake Google
 */
import { randomUUID } from "node:crypto";

const TOKEN_URL = process.env.GOOGLE_TOKEN_URL || "https://oauth2.googleapis.com/token";
const API = process.env.GOOGLE_API_BASE || "https://www.googleapis.com/calendar/v3";
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || "primary";

export const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN);

let cached = { token: "", expires: 0 };

async function accessToken() {
  if (cached.token && Date.now() < cached.expires - 60_000) return cached.token;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) throw new Error(`Google token ${res.status}: ${body.error_description || body.error || "no access token"}`);
  cached = { token: body.access_token, expires: Date.now() + (body.expires_in || 3600) * 1000 };
  return cached.token;
}

async function call(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Google Calendar ${res.status}: ${data?.error?.message || "request failed"}`);
  return data;
}

/** Busy intervals [{start, end}] on the owner's calendar between two instants. */
export async function getBusy(fromMs, toMs) {
  const data = await call("POST", `${API}/freeBusy`, {
    timeMin: new Date(fromMs).toISOString(),
    timeMax: new Date(toMs).toISOString(),
    timeZone: "UTC",
    items: [{ id: CALENDAR_ID }],
  });
  const cal = data.calendars?.[CALENDAR_ID] ?? Object.values(data.calendars ?? {})[0];
  if (cal?.errors?.length) throw new Error(`Google Calendar freeBusy: ${cal.errors[0].reason}`);
  return cal?.busy ?? [];
}

/** Creates the event with a Google Meet link; returns { meetLink, eventLink, eventId }. */
export async function createMeeting({ startMs, durationMin, name, email, company, phone, ownerName }) {
  const event = await call("POST", `${API}/calendars/${encodeURIComponent(CALENDAR_ID)}/events?conferenceDataVersion=1&sendUpdates=none`, {
    summary: `Call with ${name} (${company})`,
    description: `Booked from the website.\nName: ${name}\nCompany: ${company}\nPhone: ${phone}\nEmail: ${email}\n\nHost: ${ownerName}`,
    start: { dateTime: new Date(startMs).toISOString(), timeZone: "UTC" },
    end: { dateTime: new Date(startMs + durationMin * 60_000).toISOString(), timeZone: "UTC" },
    attendees: [{ email, displayName: name }],
    conferenceData: { createRequest: { requestId: randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } } },
  });
  const meetLink = event.hangoutLink || event.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri || "";
  if (!meetLink) throw new Error("Google Calendar created the event but returned no Meet link");
  return { meetLink, eventLink: event.htmlLink || "", eventId: event.id };
}
