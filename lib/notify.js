import 'server-only';
import nodemailer from 'nodemailer';
import * as webpushNs from 'web-push';

const webpush = webpushNs.default || webpushNs;
import { CLUB } from './club';
import { memberEmails, getPushSubs, removePushSub, addFeed } from './db';

const env = (k) => (process.env[k] || '').trim() || null;

export const emailConfigured = () => Boolean(env('GMAIL_USER') && env('GMAIL_APP_PASSWORD'));
export const pushConfigured = () => Boolean(env('VAPID_PUBLIC_KEY') && env('VAPID_PRIVATE_KEY'));
export const vapidPublicKey = () => env('VAPID_PUBLIC_KEY');

let transporter;
function mailer() {
  if (!emailConfigured()) return null;
  transporter ||= nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: env('GMAIL_USER'), pass: env('GMAIL_APP_PASSWORD').replace(/\s+/g, '') },
  });
  return transporter;
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function html(title, body, url) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #F0E2CF;border-radius:14px;overflow:hidden">
  <div style="background:#F28C28;color:#fff;padding:14px 18px;font-weight:bold;font-size:18px">⭐ ${esc(CLUB.nombre)}</div>
  <div style="padding:18px;color:#1F1A14"><h2 style="margin:0 0 10px;font-size:18px">${esc(title)}</h2>
  <p style="white-space:pre-line;line-height:1.5;margin:0 0 16px">${esc(body)}</p>
  ${url ? `<a href="${CLUB.web}${url}" style="display:inline-block;background:#F28C28;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:bold">Abrir la app</a>` : ''}
  </div><div style="padding:10px 18px;font-size:12px;color:#7A6E62;background:#FFF8EF">Mensaje automático de la app del club. Puedes cambiar tus avisos en la app, en la ficha de tu hijo/a.</div></div>`;
}

// Envía un correo. Con varios destinatarios se usa copia oculta (BCC) en lotes.
export async function sendEmail({ to = [], subject, body, url }) {
  const t = mailer();
  const list = [...new Set(to.filter(Boolean))];
  if (!t || !list.length) return { sent: 0, skipped: list.length, reason: t ? null : 'email-no-configurado' };
  let sent = 0;
  const from = `"${CLUB.nombre}" <${env('GMAIL_USER')}>`;
  for (let i = 0; i < list.length; i += 40) {
    const chunk = list.slice(i, i + 40);
    const opts = chunk.length === 1 ? { to: chunk[0] } : { to: from, bcc: chunk };
    try {
      await t.sendMail({ from, ...opts, subject, text: body + (url ? `\n\n${CLUB.web}${url}` : ''), html: html(subject, body, url) });
      sent += chunk.length;
    } catch (e) {
      console.error('[email]', e.message);
    }
  }
  return { sent, skipped: list.length - sent };
}

// Envía una notificación push a todos los móviles suscritos de esas cuentas.
export async function sendPush(emails, payload) {
  if (!pushConfigured()) return { sent: 0 };
  webpush.setVapidDetails(`mailto:${env('GMAIL_USER') || CLUB.email}`, env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'));
  let sent = 0;
  for (const email of [...new Set(emails)]) {
    for (const sub of await getPushSubs(email)) {
      try {
        await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 60 * 60 * 24 });
        sent++;
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) await removePushSub(email, sub.endpoint);
        else console.error('[push]', e.statusCode, e.body || e.message);
      }
    }
  }
  return { sent };
}

export function avisosDe(m) {
  const a = m.avisos || {};
  const vinculados = memberEmails(m);
  return {
    app: a.app !== false,
    email: a.email === true,
    emails: (a.emails || []).filter((e) => vinculados.includes(e)),
  };
}

// Aviso a la familia de un socio según sus preferencias (y siempre queda en la app).
export async function notifyMember(m, { title, body, url, kind }) {
  const prefs = avisosDe(m);
  const cuentas = memberEmails(m);
  for (const e of cuentas) await addFeed(e, { title, body, url, kind, memberId: m.id });
  const push = prefs.app ? await sendPush(cuentas, { title, body, url }) : { sent: 0 };
  const mail = prefs.email && prefs.emails.length ? await sendEmail({ to: prefs.emails, subject: title, body, url }) : { sent: 0 };
  return { push: push.sent, email: mail.sent };
}

// Comunicado general: por la app y por email a todos los correos de las fichas.
export async function notifyComunicado(members, extraEmails, { title, body, url }) {
  const cuentas = [...new Set([...members.flatMap(memberEmails), ...extraEmails])];
  for (const e of cuentas) await addFeed(e, { title, body, url, kind: 'comunicado' });
  const push = await sendPush(cuentas, { title, body, url });
  const mail = await sendEmail({ to: cuentas, subject: title, body, url });
  return { cuentas: cuentas.length, push: push.sent, email: mail.sent, emailConfigurado: emailConfigured() };
}
