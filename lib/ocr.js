import 'server-only';
import { FIELDS, ANCHORS, PRINTED, PAGE_W, PAGE_H, isCheckbox } from './fichaTemplate';
import { buildMember } from './pdf';

const key = () => (process.env.GOOGLE_VISION_API_KEY || '').trim();
export const visionConfigured = () => Boolean(key());

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9@._\-/]/g, '');

/* ---------- Llamadas a Google Vision ---------- */
async function vision(path, body) {
  const r = await fetch(`https://vision.googleapis.com/v1/${path}?key=${encodeURIComponent(key())}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error?.message || `Google Vision respondió ${r.status}`);
  return j;
}

// Devuelve, por cada página, la lista de palabras con su caja normalizada (0..1).
function wordsFromPage(page) {
  const W = page.width || 1, H = page.height || 1;
  const out = [];
  for (const b of page.blocks || []) for (const p of b.paragraphs || []) for (const w of p.words || []) {
    const text = (w.symbols || []).map((s) => s.text).join('');
    const nv = w.boundingBox?.normalizedVertices;
    const v = nv?.length ? nv.map((q) => ({ x: q.x || 0, y: q.y || 0 }))
      : (w.boundingBox?.vertices || []).map((q) => ({ x: (q.x || 0) / W, y: (q.y || 0) / H }));
    if (!v.length) continue;
    const xs = v.map((q) => q.x), ys = v.map((q) => q.y);
    out.push({ text, n: norm(text), x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) });
  }
  return out;
}

async function ocrPages(file) {
  const content = file.bytes.toString('base64');
  const features = [{ type: 'DOCUMENT_TEXT_DETECTION' }];
  const imageContext = { languageHints: ['es'] };
  if (file.type === 'application/pdf') {
    const j = await vision('files:annotate', {
      requests: [{ inputConfig: { content, mimeType: 'application/pdf' }, features, imageContext, pages: [1, 2] }],
    });
    return (j.responses?.[0]?.responses || []).map((r) => wordsFromPage(r.fullTextAnnotation?.pages?.[0] || {}));
  }
  const j = await vision('images:annotate', { requests: [{ image: { content }, features, imageContext }] });
  return [wordsFromPage(j.responses?.[0]?.fullTextAnnotation?.pages?.[0] || {})];
}

/* ---------- Alineación con la plantilla ---------- */
function fit(pairs) {
  // Mínimos cuadrados de una recta (t -> o). Si no hay datos suficientes, identidad.
  const n = pairs.length;
  if (n < 2) return { a: 1, b: 0 };
  const mt = pairs.reduce((s, p) => s + p[0], 0) / n, mo = pairs.reduce((s, p) => s + p[1], 0) / n;
  const num = pairs.reduce((s, p) => s + (p[0] - mt) * (p[1] - mo), 0);
  const den = pairs.reduce((s, p) => s + (p[0] - mt) ** 2, 0);
  if (den < 1e-4) return { a: 1, b: mo - mt };
  const a = num / den;
  if (a < 0.4 || a > 2.5) return { a: 1, b: 0 };
  return { a, b: mo - a * mt };
}

function align(words, pageIdx) {
  const px = [], py = [];
  for (const [w, p, x, y] of ANCHORS) {
    if (p !== pageIdx) continue;
    const hit = words.find((o) => o.n === w || o.n === w + ':');
    if (hit) { px.push([x / PAGE_W, hit.x0]); py.push([1 - y / PAGE_H, hit.y1]); }
  }
  return { fx: fit(px), fy: fit(py), anchors: px.length };
}

function detectPage(words) {
  const score = (p) => ANCHORS.filter((a) => a[1] === p && words.some((o) => o.n === a[0] || o.n === a[0] + ':')).length;
  return score(1) > score(0) ? 1 : 0;
}

function extract(words, pageIdx, raw) {
  const { fx, fy, anchors } = align(words, pageIdx);
  const X = (t) => fx.a * t + fx.b, Y = (t) => fy.a * t + fy.b;
  for (const f of FIELDS) {
    const [k, p, x, y, w, h] = f;
    if (p !== pageIdx || k.startsWith('firma') || k.startsWith('fecha')) continue;
    const cb = isCheckbox(f);
    const padX = cb ? 4 : 3, padTop = cb ? 4 : 8, padBot = cb ? 4 : 3;
    const rx0 = X((x - padX) / PAGE_W), rx1 = X((x + w + padX) / PAGE_W);
    const ry0 = Y(1 - (y + h + padTop) / PAGE_H), ry1 = Y(1 - (y - padBot) / PAGE_H);
    const inside = words.filter((o) => {
      const cx = (o.x0 + o.x1) / 2, cy = (o.y0 + o.y1) / 2;
      return cx >= rx0 && cx <= rx1 && cy >= ry0 && cy <= ry1 && !PRINTED.has(o.n) && !/^_+$/.test(o.text);
    });
    if (cb) {
      if (inside.length) raw[k] = true;
    } else if (inside.length) {
      inside.sort((a, b) => (Math.abs(a.y0 - b.y0) < 0.006 ? a.x0 - b.x0 : a.y0 - b.y0));
      raw[k] = inside.map((o) => o.text).join(' ').replace(/\s+([.,@])/g, '$1').replace(/([@.])\s+/g, '$1');
    }
  }
  return anchors;
}

// Lee fichas escaneadas o fotografiadas (PDF o imágenes).
export async function ocrFicha(files) {
  const raw = {};
  let anchors = 0, pages = 0;
  for (const file of files) {
    const list = await ocrPages(file);
    list.forEach((words, i) => {
      const pageIdx = file.type === 'application/pdf' ? Math.min(i, 1) : detectPage(words);
      anchors += extract(words, pageIdx, raw);
      pages++;
    });
  }
  const filled = Object.values(raw).filter((v) => v === true || (typeof v === 'string' && v)).length;
  return { fieldCount: 0, filled, pages, anchors, member: buildMember(raw) };
}
