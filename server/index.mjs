/**
 * Tiny production server: serves the built site (dist/) and handles POST /api/contact, which sends the
 * confirmation mail through the Gmail API (From: the authenticated Google account, Cc: MAIL_CC).
 *
 * Environment (see .env.example):
 *   GOOGLE_CLIENT_ID / _SECRET / _REFRESH_TOKEN  Google OAuth (calendar + gmail.send scopes). Without them the server runs
 *                         in dry-run mode: mails are logged, not sent, and MEETING_LINK is used for bookings.
 *   MAIL_FROM_EMAIL       The Gmail / Workspace address that sends the mail (must be the account of the token).
 *   EMAIL_BRAND           Product name in the mail header, subject and sender name (default "Airport Mystery Shopping").
 *   EMAIL_TEAM            Team name in the text ("your call with the iSN team"), default "iSN".
 *   MAIL_CC               Comma separated addresses that get every confirmation in Cc.
 *   SITE_URL              Public site address, shown in the mail footer.
 *   MEETING_LINK          Fallback meeting URL when Google Calendar is not configured.
 *   GOOGLE_CALENDAR_ID    Calendar that receives bookings (default "primary"); see server/google.mjs.
 *   MEETING_*             Working hours / time zone / slot length, see server/slots.mjs.
 *   PORT                  Port to listen on (Render sets it; default 8787).
 *
 * No dependencies: uses Node's http module and the global fetch.
 */
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { candidateSlots, ownerDate, removeBusy, rules, slotsForDate, zoneName } from "./slots.mjs";
import { googleEnabled, getBusy, createMeeting } from "./google.mjs";
import { bookedEmail, receivedEmail } from "./email.mjs";
import { gmailSend } from "./gmail.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(here, "../dist");
const PORT = Number(process.env.PORT) || 8787;

const env = {
  fromEmail: process.env.MAIL_FROM_EMAIL || "",
  brand: process.env.EMAIL_BRAND || "Airport Mystery Shopping",
  team: process.env.EMAIL_TEAM || "iSN",
  siteUrl: (process.env.SITE_URL || "").replace(/\/$/, ""),
  meetingLink: process.env.MEETING_LINK || "",
  cc: (process.env.MAIL_CC || "").split(",").map((x) => x.trim()).filter(Boolean),
};
// no Google credentials: dry-run, mails are only logged
const DRY_RUN = !googleEnabled;
const DAY = 86_400_000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

/* ---------- helpers ---------- */

const clean = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

function readBody(req, limit = 10_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error("too large"), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

// very small in-memory rate limit: 8 submissions per IP per hour
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 3_600_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 8;
}

function formatShort(iso) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: rules.timeZone,
  }).format(new Date(iso));
}

function formatWhen(iso, timeZone = rules.timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone,
  }).format(new Date(iso));
}

async function sendMail({ to, cc, subject, text, html }) {
  if (DRY_RUN) {
    console.log(`[dry-run] mail to ${to}${cc?.length ? ` cc ${cc.join(", ")}` : ""}\nSubject: ${subject}\n${text}\n`);
    return;
  }
  await gmailSend({ from: { email: env.fromEmail, name: env.brand }, to: [to], cc: cc ?? [], replyTo: env.fromEmail, subject, text, html });
}

/* ---------- /api/slots ---------- */

const slotHits = new Map();
function slotsLimited(ip) {
  const now = Date.now();
  const list = (slotHits.get(ip) || []).filter((t) => now - t < 3_600_000);
  list.push(now);
  slotHits.set(ip, list);
  return list.length > 120;
}

const clientIp = (req) => (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() || req.socket.remoteAddress || "unknown";

/**
 * GET /api/slots            -> { timeZone, zoneName, minDate, maxDate }  (the booking window, in the owner's time zone)
 * GET /api/slots?date=Y-M-D -> { slots: [ISO...], ... }                  free slots on that day in the owner's time zone
 */
async function handleSlots(req, res, url) {
  if (slotsLimited(clientIp(req))) return json(res, 429, { error: "Too many requests. Please try again later." });
  const now = Date.now();
  const window = {
    timeZone: rules.timeZone,
    zoneName: zoneName(now),
    durationMin: rules.durationMin,
    minDate: ownerDate(now),
    maxDate: ownerDate(now + rules.maxDays * DAY),
  };
  const day = url.searchParams.get("date");
  if (!day) return json(res, 200, window);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return json(res, 400, { error: "Invalid date." });

  let slots = slotsForDate(day, now);
  if (slots.length && googleEnabled) {
    try {
      const busy = await getBusy(slots[0], slots[slots.length - 1] + rules.durationMin * 60_000);
      slots = removeBusy(slots, busy);
    } catch (err) {
      console.error("[slots] calendar lookup failed:", err.message);
      return json(res, 502, { error: "Could not load available times. Please try again." });
    }
  }
  json(res, 200, { ...window, slots: slots.map((t) => new Date(t).toISOString()) });
}

/* ---------- /api/contact ---------- */

async function handleContact(req, res) {
  if (limited(clientIp(req))) return json(res, 429, { error: "Too many requests. Please try again later." });

  let data;
  try {
    data = JSON.parse(await readBody(req));
  } catch (e) {
    return json(res, e.status || 400, { error: "Invalid request." });
  }

  const name = clean(data.name, 120);
  const company = clean(data.company, 160);
  const phone = clean(data.phone, 40);
  const email = clean(data.email, 200);
  if (!name || !company || phone.replace(/\D/g, "").length < 7 || !EMAIL_RE.test(email)) {
    return json(res, 400, { error: "Please check your details and try again." });
  }

  // optional booking
  let booking = null;
  if (data.meeting && typeof data.meeting === "object") {
    const start = new Date(data.meeting.startISO);
    // the time must be one of the real slots (working hours, notice period, not in the past)
    if (Number.isNaN(start.getTime()) || !candidateSlots(start.getTime(), start.getTime() + 1).includes(start.getTime())) {
      return json(res, 400, { error: "Please choose one of the available times." });
    }
    // optional: the visitor's own zone, shown as a second line in the mail when it differs from the host's
    const clientZone = clean(data.meeting.timeZone, 64);
    let localWhen = "";
    if (clientZone && clientZone !== rules.timeZone) {
      try {
        localWhen = formatWhen(start.toISOString(), clientZone);
      } catch {
        localWhen = "";
      }
    }
    booking = { start, when: formatWhen(start.toISOString()), whenShort: formatShort(start.toISOString()), localWhen };
  }

  let link = env.meetingLink || (DRY_RUN ? "https://example.com/meeting-link" : "");
  if (booking && googleEnabled) {
    try {
      // re-check right before booking: someone may have taken the slot since the list was loaded
      const busy = await getBusy(booking.start.getTime(), booking.start.getTime() + rules.durationMin * 60_000);
      if (removeBusy([booking.start.getTime()], busy).length === 0) {
        return json(res, 409, { error: "That time was just taken. Please choose another." });
      }
      link = (
        await createMeeting({
          startMs: booking.start.getTime(),
          durationMin: rules.durationMin,
          name,
          email,
          company,
          phone,
          ownerName: env.fromName,
        })
      ).meetLink;
    } catch (err) {
      console.error("[contact] calendar booking failed:", err.message);
      return json(res, 502, { error: "We could not book that time. Please try again." });
    }
  }
  if (booking && !link) {
    console.error("MEETING_LINK is not set");
    return json(res, 500, { error: "Booking is temporarily unavailable. Please choose 'No, thanks, just email me'." });
  }
  if (!DRY_RUN && !env.fromEmail) {
    console.error("MAIL_FROM_EMAIL is not set");
    return json(res, 500, { error: "Something went wrong. Please try again." });
  }

  try {
    // one mail: To the visitor, Cc the team address(es)
    const person = { name, company, phone, email };
    const common = { person, brand: env.brand, team: env.team, siteUrl: env.siteUrl, logoUrl: env.siteUrl ? `${env.siteUrl}/isn-logo.png` : "" };
    let mail;
    if (booking) {
      const endMs = booking.start.getTime() + rules.durationMin * 60_000;
      const stamp = (ms) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
      const calendarUrl =
        "https://calendar.google.com/calendar/render?" +
        new URLSearchParams({
          action: "TEMPLATE",
          text: `${env.brand} call with ${env.team}`,
          dates: `${stamp(booking.start.getTime())}/${stamp(endMs)}`,
          details: `Meeting link: ${link}`,
          location: link,
        });
      mail = bookedEmail({
        ...common,
        when: booking.when,
        whenShort: booking.whenShort,
        localWhen: booking.localWhen,
        durationMin: rules.durationMin,
        meetLink: link,
        calendarUrl,
      });
    } else {
      mail = receivedEmail(common);
    }
    await sendMail({ to: email, cc: env.cc.filter((c) => c.toLowerCase() !== email.toLowerCase()), ...mail });
  } catch (err) {
    console.error("[contact] mail failed:", err.message);
    return json(res, 502, { error: "We could not send the confirmation email. Please try again." });
  }

  json(res, 200, { ok: true, booked: !!booking });
}

/* ---------- static files + SPA fallback ---------- */

async function serveStatic(req, res) {
  const url = new URL(req.url, "http://x");
  let rel = decodeURIComponent(url.pathname);
  if (rel.includes("\0")) rel = "/";
  let file = path.join(DIST, path.normalize(rel));
  if (!file.startsWith(DIST)) file = path.join(DIST, "index.html");

  let info = await stat(file).catch(() => null);
  if (info?.isDirectory()) {
    file = path.join(file, "index.html");
    info = await stat(file).catch(() => null);
  }
  if (!info) file = path.join(DIST, "index.html"); // single-page app: unknown routes get index.html

  try {
    const body = await readFile(file);
    const ext = path.extname(file);
    const immutable = /\/(assets|fonts)\//.test(file.replaceAll("\\", "/"));
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": immutable ? "public, max-age=31536000, immutable" : "no-cache",
    });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}

http
  .createServer(async (req, res) => {
    try {
      const { pathname } = new URL(req.url, "http://x");
      if (pathname === "/healthz") return json(res, 200, { ok: true });
      if (pathname === "/api/slots") {
        if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });
        return await handleSlots(req, res, new URL(req.url, "http://x"));
      }
      if (pathname === "/api/contact") {
        if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
        return await handleContact(req, res);
      }
      if (req.method !== "GET" && req.method !== "HEAD") return json(res, 405, { error: "Method not allowed" });
      return await serveStatic(req, res);
    } catch (err) {
      console.error(err);
      if (!res.headersSent) json(res, 500, { error: "Server error" });
    }
  })
  .listen(PORT, () => {
    console.log(`Server on :${PORT}${DRY_RUN ? " (SendGrid not configured: dry-run mode, mails are only logged)" : ""}${googleEnabled ? " | Google Calendar on" : " | fixed MEETING_LINK mode"}`);
  });
