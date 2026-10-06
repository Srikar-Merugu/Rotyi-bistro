// Branded HTML email, matching the website: cream paper, paprika-red header
// with the ROTYI wordmark, sticker label, condensed headline, a "ticket" with
// the details, a red pill button and an ink footer.
// Table layout + inline styles only, so it renders in Gmail, Outlook and Apple Mail.

import { venue } from "./site";

const C = {
  cream: "#f6e6d0",
  paper: "#fbf3e7",
  red: "#c62d17",
  redDeep: "#9f2412",
  mustard: "#f7c548",
  ink: "#221a16",
  muted: "#6f5f52",
  line: "#e5d4bd",
};

// Web fonts load in Apple Mail / iOS; Gmail falls back to the stacks below.
const DISPLAY = "'Anton','Oswald','Arial Narrow','Helvetica Neue Condensed',Impact,sans-serif";
const STICKER = "'Titan One','Arial Black','Helvetica Neue',Arial,sans-serif";
const BODY = "'Barlow Condensed','Helvetica Neue',Arial,sans-serif";

export type EmailOptions = {
  /** Short sticker label above the headline, e.g. "FOGLALÁS". */
  label?: string;
  title: string;
  /** Pre-escaped HTML paragraphs. */
  paragraphs?: string[];
  /** Ticket rows: [label, value] (values pre-escaped). */
  details?: [string, string][];
  cta?: { label: string; href: string };
  /** Small print under the button (pre-escaped). */
  after?: string[];
  /** Inbox preview text. */
  preheader?: string;
  hu?: boolean;
};

export function brandedEmail({ label, title, paragraphs = [], details, cta, after = [], preheader, hu = true }: EmailOptions) {
  const p = (html: string) => `<p style="margin:0 0 14px;font-family:${BODY};font-size:18px;line-height:1.5;color:${C.ink}">${html}</p>`;
  const ticket = details?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 22px;background:${C.mustard};border:2px dashed ${C.ink};border-radius:16px">
${details
  .map(
    ([k, v], i) => `<tr><td style="padding:${i === 0 ? "16px" : "6px"} 18px ${i === details.length - 1 ? "16px" : "6px"};font-family:${BODY};font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${C.redDeep};width:38%;vertical-align:top">${k}</td>
<td style="padding:${i === 0 ? "16px" : "6px"} 18px ${i === details.length - 1 ? "16px" : "6px"};font-family:${v.includes("@") ? BODY : DISPLAY};font-size:${v.includes("@") ? "18px;font-weight:700" : "20px;text-transform:uppercase"};letter-spacing:.5px;color:${C.ink};vertical-align:top;word-break:break-word">${v}</td></tr>`,
  )
  .join("")}
</table>`
    : "";
  const button = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px"><tr><td style="border-radius:999px;background:${C.red};border-bottom:4px solid ${C.redDeep}">
<a href="${cta.href}" style="display:inline-block;padding:15px 30px;font-family:${DISPLAY};font-size:18px;letter-spacing:1px;text-transform:uppercase;color:#ffffff;text-decoration:none;border-radius:999px">${cta.label} &rarr;</a>
</td></tr></table>`
    : "";

  return `<!doctype html>
<html lang="${hu ? "hu" : "en"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@500;700&family=Titan+One&display=swap" rel="stylesheet">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:${C.cream}">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream}"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">

<tr><td style="background:${C.red};border:3px solid ${C.ink};border-bottom:0;border-radius:24px 24px 0 0;padding:26px 30px 22px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="font-family:${STICKER};font-size:40px;line-height:1;color:${C.paper};letter-spacing:1px">ROTYI</td>
    <td align="right" style="font-family:${BODY};font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${C.mustard}">Bisztró<br>VII. ker · Budapest</td>
  </tr></table>
</td></tr>

<tr><td style="background:${C.paper};border:3px solid ${C.ink};border-top:0;border-bottom:0;padding:30px 30px 10px">
  ${label ? `<span style="display:inline-block;margin:0 0 12px;padding:5px 12px;background:${C.paper};border:2px solid ${C.red};border-radius:999px;font-family:${STICKER};font-size:13px;letter-spacing:1px;text-transform:uppercase;color:${C.red}">${label}</span>` : ""}
  <h1 style="margin:0 0 16px;font-family:${DISPLAY};font-weight:400;font-size:40px;line-height:1.02;text-transform:uppercase;letter-spacing:.5px;color:${C.red}">${title}</h1>
  ${paragraphs.map(p).join("\n  ")}
  ${ticket}
  ${button}
  ${after.map((a) => `<p style="margin:0 0 10px;font-family:${BODY};font-size:15px;line-height:1.45;color:${C.muted}">${a}</p>`).join("\n  ")}
</td></tr>

<tr><td style="background:${C.ink};border:3px solid ${C.ink};border-radius:0 0 24px 24px;padding:22px 30px">
  <p style="margin:0 0 6px;font-family:${DISPLAY};font-size:16px;letter-spacing:1.5px;text-transform:uppercase;color:${C.mustard}">${hu ? "Gulyás · Lángos · Napi menü" : "Goulash · Lángos · Daily lunch"}</p>
  <p style="margin:0 0 10px;font-family:${BODY};font-size:15px;line-height:1.5;color:${C.cream}">
    ${venue.name} · ${venue.street}, ${venue.postalCode} ${venue.city}<br>
    <a href="${venue.phoneHref}" style="color:${C.cream}">${venue.phone}</a> · <a href="mailto:${venue.email}" style="color:${C.cream}">${venue.email}</a>
  </p>
  <p style="margin:0;font-family:${BODY};font-size:12px;color:#b9a99a">${
    hu ? "Ez egy Kyro Studio demó koncepció. A Rotyi Bisztró kitalált hely." : "Demo concept by Kyro Studio. Rotyi Bistro is fictional."
  }</p>
</td></tr>

</table></td></tr></table></body></html>`;
}
