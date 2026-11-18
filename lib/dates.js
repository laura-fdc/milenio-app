export function todayMadrid() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());
}
export function dowOf(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
export function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}
export function prettyDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return cap(new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
    .format(new Date(Date.UTC(y, m - 1, d))));
}
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const isIso = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
// Busca el día de sesión más cercano (hacia atrás o adelante) cuyo día de la semana esté en dows.
export function nearestSessionDay(iso, dows, dir = -1, includeSelf = true) {
  if (!dows.length) return iso;
  let cur = includeSelf ? iso : addDays(iso, dir);
  for (let i = 0; i < 8; i++) {
    if (dows.includes(dowOf(cur))) return cur;
    cur = addDays(cur, dir);
  }
  return iso;
}
