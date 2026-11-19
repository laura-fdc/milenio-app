// Almacén clave-valor: Upstash Redis en producción; en local, si no hay credenciales,
// un almacén en memoria que se guarda en .data/dev-db.json.
import 'server-only';
import { Redis } from '@upstash/redis';
import fs from 'node:fs';
import path from 'node:path';

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

function memoryStore() {
  const file = path.join(process.cwd(), '.data', 'dev-db.json');
  const g = globalThis;
  if (!g.__milenioMem) {
    let data = {};
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
    g.__milenioMem = data;
  }
  const db = g.__milenioMem;
  const persist = () => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(db));
  };
  const clone = (v) => (v === undefined ? null : JSON.parse(JSON.stringify(v)));
  return {
    async get(k) { return clone(db[k]); },
    async set(k, v) { db[k] = clone(v); persist(); return 'OK'; },
    async del(...ks) { ks.forEach((k) => delete db[k]); persist(); return ks.length; },
    async mget(...ks) { return ks.map((k) => clone(db[k])); },
    async sadd(k, ...vs) { const s = new Set(db[k] || []); vs.forEach((v) => s.add(v)); db[k] = [...s]; persist(); return 1; },
    async srem(k, ...vs) { db[k] = (db[k] || []).filter((v) => !vs.includes(v)); persist(); return 1; },
    async smembers(k) { return [...(db[k] || [])]; },
    async hset(k, obj) { db[k] = { ...(db[k] || {}), ...clone(obj) }; persist(); return 1; },
    async hgetall(k) { const v = db[k]; return v && Object.keys(v).length ? clone(v) : null; },
    async incr(k) { db[k] = (Number(db[k]) || 0) + 1; persist(); return db[k]; },
    async hdel(k, ...fs_) { const v = db[k] || {}; fs_.forEach((f) => delete v[f]); db[k] = v; persist(); return 1; },
  };
}

export const kv = url && token ? new Redis({ url, token }) : memoryStore();
export const usingRedis = Boolean(url && token);
