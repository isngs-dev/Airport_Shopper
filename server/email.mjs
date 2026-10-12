/**
 * Email templates in the website's theme (midnight navy, runway amber, sky cyan).
 * Table layout with inline styles so they render in Gmail, Outlook and Apple Mail.
 * Every mail has a real plain-text twin, which together with a short, specific subject
 * keeps spam filters happy. All user input is escaped.
 */

const C = {
  bg: "#0A1128",
  card: "#0F1A3D",
  panel: "#14224A",
  line: "#243462",
  text: "#EEF2FA",
  mute: "#A9B6D3",
  amber: "#FFB703",
  cyan: "#4CC9F0",
};
const FONT = "'Space Grotesk','Segoe UI',Helvetica,Arial,sans-serif";
const BODY_FONT = "Inter,'Segoe UI',Helvetica,Arial,sans-serif";

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Hidden preview line shown next to the subject in inboxes. */
const preheader = (t) =>
  `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.bg};font-size:1px;line-height:1px">${esc(t)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>`;

function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="${C.amber}" style="border-radius:999px;background:${C.amber}">
<a href="${esc(href)}" style="display:inline-block;padding:14px 30px;font-family:${FONT};font-size:15px;font-weight:700;letter-spacing:0.04em;color:${C.bg};text-decoration:none;border-radius:999px">${esc(label)}</a>
</td></tr></table>`;
}

function row(label, value, extra = "") {
  return `<tr><td style="padding:12px 0;border-top:1px solid ${C.line}">
<div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${C.mute}">${esc(label)}</div>
<div style="margin-top:4px;font-family:${FONT};font-size:17px;font-weight:700;color:${C.text}">${value}</div>${extra}
</td></tr>`;
}

/** Shared page frame: header, card, footer. */
function layout({ title, preview, brand, logoUrl, bodyHtml, footer }) {
  const logo = logoUrl
    ? `<span style="display:inline-block;background:#ffffff;border-radius:999px;padding:7px 14px;vertical-align:middle"><img src="${esc(logoUrl)}" alt="iSN" height="24" style="display:block;height:24px;width:auto;border:0"></span>`
    : `<span style="font-family:${FONT};font-size:22px;font-weight:700;font-style:italic;color:${C.cyan}">iSN</span>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};-webkit-text-size-adjust:100%">
${preheader(preview)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.bg}" style="background:${C.bg}"><tr><td align="center" style="padding:32px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
<tr><td style="padding:0 6px 20px">${logo}<span style="display:inline-block;width:1px;height:22px;background:${C.line};margin:0 14px;vertical-align:middle"></span><span style="font-family:${FONT};font-size:17px;font-weight:700;color:${C.text};vertical-align:middle">${esc(brand)}</span></td></tr>
<tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:24px;overflow:hidden">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td height="4" style="height:4px;line-height:4px;font-size:0;background:${C.amber};background-image:linear-gradient(90deg,${C.cyan},${C.amber})">&nbsp;</td></tr>
<tr><td style="padding:34px 32px 30px;font-family:${BODY_FONT};color:${C.text}">${bodyHtml}</td></tr>
</table></td></tr>
<tr><td style="padding:20px 10px 0;font-family:${BODY_FONT};font-size:12px;line-height:1.6;color:${C.mute};text-align:center">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

const h1 = (t) => `<h1 style="margin:0 0 14px;font-family:${FONT};font-size:28px;line-height:1.2;font-weight:700;color:${C.text}">${esc(t)}</h1>`;
const p = (t, extra = "") => `<p style="margin:0 0 18px;font-size:16px;line-height:1.65;color:${C.mute};${extra}">${t}</p>`;

function detailsBlock(person) {
  const cell = (l, v) =>
    `<tr><td style="padding:3px 0;font-size:14px;color:${C.mute};width:96px">${esc(l)}</td><td style="padding:3px 0;font-size:14px;color:${C.text}">${esc(v)}</td></tr>`;
  return `<div style="margin-top:26px;padding:16px 18px;background:${C.panel};border-radius:14px">
<div style="margin-bottom:8px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${C.amber}">Details you sent</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">${cell("Name", person.name)}${cell("Company", person.company)}${cell("Phone", person.phone)}${cell("Email", person.email)}</table></div>`;
}

const footerHtml = (siteUrl, brand) =>
  `You are receiving this email because you submitted the contact form${siteUrl ? ` on <a href="${esc(siteUrl)}" style="color:${C.mute}">${esc(siteUrl.replace(/^https?:\/\//, ""))}</a>` : ""}.<br>Just reply to this email if you have a question.<br><span style="color:${C.line}">${esc(brand)}</span>`;
const footerText = (siteUrl) => `You are receiving this email because you submitted the contact form${siteUrl ? ` on ${siteUrl}` : ""}.\nJust reply to this email if you have a question.`;

/* ---------- visitor: call booked ---------- */

export function bookedEmail({ person, brand, team, when, localWhen, durationMin, meetLink, calendarUrl, siteUrl, logoUrl }) {
  const subject = `Your call is booked for ${when}`;
  const preview = `${when}. Meeting link inside.`;
  const html = layout({
    title: subject,
    preview,
    brand,
    logoUrl,
    footer: footerHtml(siteUrl, brand),
    bodyHtml:
      h1("Your call is booked") +
      p(`Hi ${esc(person.name)}, thank you for getting in touch. Here are the details of your call with the ${esc(team)} team.`) +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 24px">` +
      row("When", esc(when), localWhen ? `<div style="margin-top:4px;font-size:13px;color:${C.mute}">Your time: ${esc(localWhen)}</div>` : "") +
      row("Duration", `${durationMin} minutes`) +
      `</table>` +
      button(meetLink, "Join the meeting") +
      p(`<a href="${esc(calendarUrl)}" style="color:${C.cyan};text-decoration:underline">Add to Google Calendar</a>`, "margin:22px 0 0;font-size:14px") +
      detailsBlock(person),
  });
  const text = [
    `Hi ${person.name},`,
    "",
    `Thank you for getting in touch. Your call with the ${team} team is booked.`,
    "",
    `When: ${when}`,
    localWhen ? `Your time: ${localWhen}` : null,
    `Duration: ${durationMin} minutes`,
    `Join the meeting: ${meetLink}`,
    `Add to Google Calendar: ${calendarUrl}`,
    "",
    "Details you sent:",
    `Name: ${person.name}`,
    `Company: ${person.company}`,
    `Phone: ${person.phone}`,
    `Email: ${person.email}`,
    "",
    footerText(siteUrl),
    brand,
  ]
    .filter((l) => l !== null)
    .join("\n");
  return { subject, html, text };
}

/* ---------- visitor: no call ---------- */

export function receivedEmail({ person, brand, team, siteUrl, logoUrl }) {
  const subject = "We have received your details";
  const html = layout({
    title: subject,
    preview: `Thank you, ${person.name}. The ${team} team will be in touch by email.`,
    brand,
    logoUrl,
    footer: footerHtml(siteUrl, brand),
    bodyHtml:
      h1("Thank you for getting in touch") +
      p(`Hi ${esc(person.name)}, we have received your details. The ${esc(team)} team will be in touch with you by email.`) +
      detailsBlock(person),
  });
  const text = [
    `Hi ${person.name},`,
    "",
    `Thank you for getting in touch. We have received your details and the ${team} team will be in touch with you by email.`,
    "",
    "Details you sent:",
    `Name: ${person.name}`,
    `Company: ${person.company}`,
    `Phone: ${person.phone}`,
    `Email: ${person.email}`,
    "",
    footerText(siteUrl),
    brand,
  ].join("\n");
  return { subject, html, text };
}

/* ---------- team: new lead ---------- */

export function leadEmail({ person, brand, when, meetLink, logoUrl }) {
  const subject = when ? `New lead with a call booked: ${person.name}` : `New lead: ${person.name}`;
  const html = layout({
    title: subject,
    preview: `${person.name}, ${person.company}`,
    brand,
    logoUrl,
    footer: `Sent automatically from the contact form.`,
    bodyHtml:
      h1(when ? "New lead, call booked" : "New lead") +
      p(when ? `${esc(person.name)} booked a call for <strong style="color:${C.text}">${esc(when)}</strong>.` : "No call was booked.") +
      (meetLink ? button(meetLink, "Open meeting link") : "") +
      detailsBlock(person),
  });
  const text = [
    when ? `Call booked: ${when}` : "No call booked.",
    meetLink ? `Meeting link: ${meetLink}` : null,
    `Name: ${person.name}`,
    `Company: ${person.company}`,
    `Phone: ${person.phone}`,
    `Email: ${person.email}`,
  ]
    .filter((l) => l !== null)
    .join("\n");
  return { subject, html, text };
}
