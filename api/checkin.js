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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { fid } = req.method === 'POST' ? req.body : req.query;
  if (!fid) return res.json({ error: 'No fid' });

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const checkinKey = `checkin:${fid}:${today}`;
  const streakKey = `streak:${fid}`;
  const pointsKey = `points:${fid}`;

  // Check if already checked in today
  const alreadyCheckedIn = await redis('get', checkinKey);
  if (alreadyCheckedIn) {
    const streak = await redis('get', streakKey) || 1;
    const points = await redis('get', pointsKey) || 0;
    return res.json({ alreadyCheckedIn: true, streak: parseInt(streak), points: parseInt(points) });
  }

  // Mark check-in for today (expires in 48h)
  await redis('set', checkinKey, '1');
  await redis('expire', checkinKey, '172800');

  // Update streak
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const yesterdayKey = `checkin:${fid}:${yesterday}`;
  const hadYesterday = await redis('get', yesterdayKey);
  
  let streak = hadYesterday ? (parseInt(await redis('get', streakKey) || 0) + 1) : 1;
  await redis('set', streakKey, streak.toString());

  // Add points: 10 base + 5 per streak day (max 50 bonus)
  const bonus = Math.min((streak - 1) * 5, 50);
  const earnedPoints = 10 + bonus;
  const newPoints = parseInt(await redis('incrby', pointsKey, earnedPoints.toString()));

  return res.json({ success: true, streak, earnedPoints, totalPoints: newPoints });
}
