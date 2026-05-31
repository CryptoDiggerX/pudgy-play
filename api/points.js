const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(cmd, ...args) {
  const res = await fetch(`${REDIS_URL}/${cmd}/${args.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
  });
  const data = await res.json();
  return data.result;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { fid } = req.query;
  if (!fid) return res.json({ error: 'No fid' });

  const points = await redis('get', `points:${fid}`) || '0';
  const streak = await redis('get', `streak:${fid}`) || '0';
  const invites = await redis('get', `invites:${fid}`) || '0';
  const today = new Date().toISOString().split('T')[0];
  const checkedIn = await redis('get', `checkin:${fid}:${today}`);
  const hasPaid = await redis('get', `paid:${fid}:${today}`);

  return res.json({
    points: parseInt(points),
    streak: parseInt(streak),
    invites: parseInt(invites),
    checkedInToday: !!checkedIn,
    paidToday: !!hasPaid
  });
}
