/**
 * Tiny production server: serves the built site (dist/) and handles POST /api/contact,
 * which sends the confirmation mail through SendGrid.
 *
 * Environment (see .env.example):
 *   SENDGRID_API_KEY      SendGrid API key. Without it the server runs in dry-run mode (logs mails, sends nothing).
 *   SENDGRID_FROM_EMAIL   Verified sender address in SendGrid.
 *   SENDGRID_FROM_NAME    Sender display name (default "iSN").
 *   MEETING_LINK          Meeting URL included in the mail when the visitor books a call.
 *   NOTIFY_EMAIL          Optional. Receives a copy of every lead (comma separated for several).
 *   PORT                  Port to listen on (Render sets it; default 8787).
 *
 * No dependencies: uses Node's http module and the global fetch.
 */
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(here, "../dist");
const PORT = Number(process.env.PORT) || 8787;

const env = {
  apiKey: process.env.SENDGRID_API_KEY || "",
  fromEmail: process.env.SENDGRID_FROM_EMAIL || "",
  fromName: process.env.SENDGRID_FROM_NAME || "iSN",
  meetingLink: process.env.MEETING_LINK || "",
  notify: (process.env.NOTIFY_EMAIL || "").split(",").map((s) => s.trim()).filter(Boolean),
};
const DRY_RUN = !env.apiKey;

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

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
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

function formatWhen(iso, timeZone) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "short", timeZone }).format(new Date(iso));
}

function icsDate(d) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function buildIcs({ start, link, name }) {
  const end = new Date(start.getTime() + 30 * 60_000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//iSN//Contact//EN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${randomUUID()}@airport-shopper`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:Call with ${env.fromName}`,
    `DESCRIPTION:Meeting link: ${link}\\nBooked by ${name}`,
    `LOCATION:${link}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

async function sendMail({ to, subject, text, html, attachments }) {
  if (DRY_RUN) {
    console.log(`[dry-run] mail to ${to}\nSubject: ${subject}\n${text}\n`);
    return;
  }
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: env.fromEmail, name: env.fromName },
      subject,
      content: [
        { type: "text/plain", value: text },
        { type: "text/html", value: html },
      ],
      ...(attachments ? { attachments } : {}),
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`SendGrid ${res.status}: ${detail.slice(0, 300)}`);
  }
}

/* ---------- /api/contact ---------- */

async function handleContact(req, res) {
  const ip = (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() || req.socket.remoteAddress || "unknown";
  if (limited(ip)) return json(res, 429, { error: "Too many requests. Please try again later." });

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
    const timeZone = clean(data.meeting.timeZone, 64) || "UTC";
    try {
      new Intl.DateTimeFormat("en-GB", { timeZone });
    } catch {
      return json(res, 400, { error: "Invalid time zone." });
    }
    const now = Date.now();
    if (Number.isNaN(start.getTime()) || start.getTime() < now || start.getTime() > now + 120 * 86_400_000) {
      return json(res, 400, { error: "Please choose a date and time in the future." });
    }
    booking = { start, timeZone, when: formatWhen(start.toISOString(), timeZone) };
  }

  const link = env.meetingLink || (DRY_RUN ? "https://example.com/meeting-link" : "");
  if (booking && !link) {
    console.error("MEETING_LINK is not set");
    return json(res, 500, { error: "Booking is temporarily unavailable. Please choose 'No, thanks, just email me'." });
  }
  if (!DRY_RUN && !env.fromEmail) {
    console.error("SENDGRID_FROM_EMAIL is not set");
    return json(res, 500, { error: "Something went wrong. Please try again." });
  }

  try {
    // 1. confirmation to the visitor
    const subject = booking ? "Your call is booked" : "We have received your details";
    const text = booking
      ? `Hi ${name},\n\nThank you for getting in touch. Your call is booked for ${booking.when} (${booking.timeZone}).\n\nJoin the meeting here: ${link}\n\nA calendar invite is attached.\n\n${env.fromName}`
      : `Hi ${name},\n\nThank you for getting in touch. We have received your details and will email you.\n\n${env.fromName}`;
    const html = booking
      ? `<p>Hi ${esc(name)},</p><p>Thank you for getting in touch. Your call is booked for <strong>${esc(booking.when)}</strong> (${esc(booking.timeZone)}).</p><p><a href="${esc(link)}">Join the meeting</a></p><p>A calendar invite is attached.</p><p>${esc(env.fromName)}</p>`
      : `<p>Hi ${esc(name)},</p><p>Thank you for getting in touch. We have received your details and will email you.</p><p>${esc(env.fromName)}</p>`;
    const attachments = booking
      ? [
          {
            content: Buffer.from(buildIcs({ start: booking.start, link, name })).toString("base64"),
            filename: "meeting.ics",
            type: "text/calendar; method=REQUEST",
            disposition: "attachment",
          },
        ]
      : undefined;
    await sendMail({ to: email, subject, text, html, attachments });

    // 2. copy of the lead for the team
    for (const to of env.notify) {
      const lines = [`Name: ${name}`, `Company: ${company}`, `Phone: ${phone}`, `Email: ${email}`, booking ? `Call: ${booking.when} (${booking.timeZone})` : "Call: not booked"];
      await sendMail({
        to,
        subject: booking ? `New lead with a call booked: ${name}` : `New lead: ${name}`,
        text: lines.join("\n"),
        html: `<p>${lines.map(esc).join("<br>")}</p>`,
      });
    }
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
    console.log(`Server on :${PORT}${DRY_RUN ? " (SendGrid not configured: dry-run mode, mails are only logged)" : ""}`);
  });
