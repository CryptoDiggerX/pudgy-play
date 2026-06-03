import { redis } from './_redis.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { fid } = req.method === 'POST' ? req.body : req.query;
  if (!fid) return res.json({ error: 'No fid' });

  const today = new Date().toISOString().split('T')[0];
  const checkinKey = `checkin:${fid}:${today}`;
  const streakKey = `streak:${fid}`;
  const pointsKey = `points:${fid}`;

  const alreadyCheckedIn = await redis('get', checkinKey);
  if (alreadyCheckedIn) {
    const streak = await redis('get', streakKey) || 1;
    const points = await redis('get', pointsKey) || 0;
    return res.json({ alreadyCheckedIn: true, streak: parseInt(streak), points: parseInt(points) });
  }

  await redis('set', checkinKey, '1');
  await redis('expire', checkinKey, '172800');

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const hadYesterday = await redis('get', `checkin:${fid}:${yesterday}`);
  let streak = hadYesterday ? (parseInt(await redis('get', streakKey) || '0') + 1) : 1;
  await redis('set', streakKey, streak.toString());

  const bonus = Math.min((streak - 1) * 5, 50);
  const earnedPoints = 10 + bonus;
  const newPoints = await redis('incrby', pointsKey, earnedPoints.toString());

  return res.json({ success: true, streak, earnedPoints, totalPoints: parseInt(newPoints) });
}
