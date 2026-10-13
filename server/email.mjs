/**
 * Confirmation emails. Layout and look follow the MS Dashboard reference mail: warm beige page,
 * white rounded card, "iSN | brand" header, blue status pill, tan details panel, rust call-to-action button.
 * Table layout with inline styles so it renders in Gmail, Outlook and Apple Mail, plus a real plain-text twin.
 * All user input is escaped.
 */

const C = {
  page: "#F5EEE3",
  card: "#FFFFFF",
  ink: "#2B211B",
  mute: "#6E6259",
  label: "#8A7C70",
  panel: "#F8F0E4",
  line: "#EADFCF",
  blue: "#2D5BD0",
  pillBg: "#E4ECFB",
  button: "#B5541C",
};
const FONT = "Inter,'Segoe UI',Helvetica,Arial,sans-serif";

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const preheader = (t) =>
  `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.page};font-size:1px;line-height:1px">${esc(t)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>`;

function layout({ title, preview, brand, pill, bodyHtml, footer }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%">
${preheader(preview)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background:${C.page}"><tr><td align="center" style="padding:36px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
<tr><td style="padding:0 8px 18px;font-family:${FONT}">
<span style="font-size:22px;font-weight:700;font-style:italic;color:${C.blue};vertical-align:middle">iSN</span><span style="display:inline-block;width:1px;height:22px;background:${C.line};margin:0 14px;vertical-align:middle"></span><span style="font-size:19px;font-weight:700;color:${C.ink};vertical-align:middle">${esc(brand)}</span>
</td></tr>
<tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:26px;padding:34px 34px 30px;font-family:${FONT};color:${C.ink}">
<span style="display:inline-block;padding:7px 16px;border-radius:999px;background:${C.pillBg};color:${C.blue};font-size:13px;font-weight:700;letter-spacing:0.02em">${esc(pill)}</span>
${bodyHtml}
</td></tr>
<tr><td style="padding:20px 12px 0;font-family:${FONT};font-size:12px;line-height:1.65;color:${C.label};text-align:center">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

const h1 = (t) => `<h1 style="margin:22px 0 14px;font-family:${FONT};font-size:30px;line-height:1.2;font-weight:800;color:${C.ink}">${esc(t)}</h1>`;
const p = (t, extra = "") => `<p style="margin:0 0 22px;font-size:16px;line-height:1.7;color:${C.mute};${extra}">${t}</p>`;

function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="${C.button}" style="border-radius:999px;background:${C.button}">
<a href="${esc(href)}" style="display:inline-block;padding:15px 32px;font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px">${esc(label)}</a>
</td></tr></table>`;
}

const label = (t) => `<div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${C.label}">${esc(t)}</div>`;

function panel(inner) {
  return `<div style="margin:6px 0 24px;padding:20px 22px;background:${C.panel};border-radius:18px">${inner}</div>`;
}

function detailsBlock(person) {
  const cell = (l, v) =>
    `<tr><td style="padding:3px 18px 3px 0;font-size:14px;color:${C.label}">${esc(l)}</td><td style="padding:3px 0;font-size:14px;color:${C.ink}">${esc(v)}</td></tr>`;
  return `<div style="margin-top:26px;padding-top:20px;border-top:1px solid ${C.line}">${label("Details you sent")}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px">${cell("Name", person.name)}${cell("Company", person.company)}${cell("Phone", person.phone)}${cell("Email", person.email)}</table></div>`;
}

const footerHtml = (siteUrl) =>
  `You received this email because you submitted the contact form${siteUrl ? ` on <a href="${esc(siteUrl)}" style="color:${C.label}">${esc(siteUrl.replace(/^https?:\/\//, ""))}</a>` : ""}.<br>Reply to this email if you have any questions.`;
const footerText = (siteUrl) => `You received this email because you submitted the contact form${siteUrl ? ` on ${siteUrl}` : ""}.\nReply to this email if you have any questions.`;

const textDetails = (person) => ["Details you sent:", `Name: ${person.name}`, `Company: ${person.company}`, `Phone: ${person.phone}`, `Email: ${person.email}`];

/* ---------- call booked ---------- */

export function bookedEmail({ person, brand, team, when, whenShort, localWhen, durationMin, meetLink, calendarUrl, siteUrl }) {
  const subject = `Confirmed: your ${brand} call on ${whenShort}`;
  const html = layout({
    title: subject,
    preview: `${when}. Your meeting link is inside.`,
    brand,
    pill: "Meeting confirmed",
    footer: footerHtml(siteUrl),
    bodyHtml:
      h1("Your meeting is confirmed") +
      p(`Hi ${esc(person.name)}, your call with the ${esc(team)} team is confirmed.`) +
      panel(
        label("When") +
          `<div style="margin:4px 0 0;font-size:18px;font-weight:700;color:${C.ink}">${esc(when)}</div>` +
          (localWhen ? `<div style="margin-top:3px;font-size:13px;color:${C.mute}">Your time: ${esc(localWhen)}</div>` : "") +
          `<div style="height:16px;line-height:16px;font-size:0">&nbsp;</div>` +
          label("Duration") +
          `<div style="margin:4px 0 0;font-size:18px;font-weight:700;color:${C.ink}">${durationMin} minutes</div>`,
      ) +
      button(meetLink, "Join the meeting") +
      p(`<a href="${esc(calendarUrl)}" style="color:${C.blue};text-decoration:underline">Add to Google Calendar</a>`, "margin:20px 0 0;font-size:14px") +
      detailsBlock(person),
  });
  const text = [
    `Hi ${person.name},`,
    "",
    `Your call with the ${team} team is confirmed.`,
    "",
    `When: ${when}`,
    localWhen ? `Your time: ${localWhen}` : null,
    `Duration: ${durationMin} minutes`,
    `Join the meeting: ${meetLink}`,
    `Add to Google Calendar: ${calendarUrl}`,
    "",
    ...textDetails(person),
    "",
    footerText(siteUrl),
  ]
    .filter((l) => l !== null)
    .join("\n");
  return { subject, html, text };
}

/* ---------- no call ---------- */

export function receivedEmail({ person, brand, team, siteUrl }) {
  const subject = `We have received your details`;
  const html = layout({
    title: subject,
    preview: `Thank you, ${person.name}. The ${team} team will be in touch by email.`,
    brand,
    pill: "Details received",
    footer: footerHtml(siteUrl),
    bodyHtml:
      h1("Thank you for getting in touch") +
      p(`Hi ${esc(person.name)}, we have received your details. The ${esc(team)} team will be in touch with you by email.`, "margin:0") +
      detailsBlock(person),
  });
  const text = [
    `Hi ${person.name},`,
    "",
    `Thank you for getting in touch. We have received your details and the ${team} team will be in touch with you by email.`,
    "",
    ...textDetails(person),
    "",
    footerText(siteUrl),
  ].join("\n");
  return { subject, html, text };
}
