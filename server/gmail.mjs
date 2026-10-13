/**
 * Sends mail through the Gmail API as the authenticated account (the same OAuth refresh token as the calendar).
 * Needs the Gmail API enabled in the Google Cloud project and the gmail.send scope on the token
 * (run `npm run google:auth` again after upgrading).
 *
 * The message is a multipart/alternative MIME mail (plain text + HTML), built by hand: no dependencies.
 */
import { randomUUID } from "node:crypto";
import { accessToken } from "./google.mjs";

const SEND_URL = process.env.GMAIL_API_BASE || "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

/** Header values must never contain line breaks (header injection). */
const oneLine = (s) => String(s).replace(/[\r\n]+/g, " ").trim();
/** RFC 2047 encoding for non-ASCII header text. */
const encodeWord = (s) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s, "utf8").toString("base64")}?=`);
const address = (email, name) => (name ? `${encodeWord(oneLine(name).replace(/["\\]/g, ""))} <${oneLine(email)}>` : oneLine(email));
const b64lines = (str) => Buffer.from(str, "utf8").toString("base64").replace(/.{76}/g, "$&\r\n");
const b64url = (buf) => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function buildMime({ from, to, cc = [], replyTo, subject, text, html }) {
  const boundary = `b_${randomUUID().replace(/-/g, "")}`;
  const domain = from.email.split("@")[1] || "localhost";
  const lines = [
    `From: ${address(from.email, from.name)}`,
    `To: ${to.map((t) => address(t)).join(", ")}`,
    cc.length ? `Cc: ${cc.map((t) => address(t)).join(", ")}` : null,
    replyTo ? `Reply-To: ${address(replyTo)}` : null,
    `Subject: ${encodeWord(oneLine(subject))}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${randomUUID()}@${domain}>`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].filter(Boolean);

  return (
    lines.join("\r\n") +
    "\r\n\r\n" +
    `--${boundary}\r\nContent-Type: text/plain; charset="UTF-8"\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64lines(text)}\r\n` +
    `--${boundary}\r\nContent-Type: text/html; charset="UTF-8"\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64lines(html)}\r\n` +
    `--${boundary}--\r\n`
  );
}

export async function gmailSend(message) {
  const raw = b64url(Buffer.from(buildMime(message), "utf8"));
  const res = await fetch(SEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Gmail ${res.status}: ${body?.error?.message || "send failed"}`);
  }
}
