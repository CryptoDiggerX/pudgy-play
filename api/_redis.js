// Auto-detect which environment variable names Vercel set
const REDIS_URL = 
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL ||
  process.env.KV_URL ||
  process.env.REDIS_URL;

const REDIS_TOKEN = 
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.KV_REST_API_TOKEN ||
  process.env.KV_REST_API_READ_ONLY_TOKEN ||
  process.env.REDIS_TOKEN;

export async function redis(cmd, ...args) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    throw new Error("Redis not configured. URL: " + REDIS_URL + " TOKEN: " + (REDIS_TOKEN ? "set" : "missing"));
  }
  const url = `${REDIS_URL}/${cmd}/${args.map(a => encodeURIComponent(String(a))).join('/')}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}
