import { redis } from './_redis.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { fid } = req.query;
  if (!fid) return res.json({ error: 'No fid' });

  const today = new Date().toISOString().split('T')[0];
  const [points, streak, invites, checkedIn, hasPaid] = await Promise.all([
    redis('get', `points:${fid}`).catch(() => '0'),
    redis('get', `streak:${fid}`).catch(() => '0'),
    redis('get', `invites:${fid}`).catch(() => '0'),
    redis('get', `checkin:${fid}:${today}`).catch(() => null),
    redis('get', `paid:${fid}:${today}`).catch(() => null),
  ]);

  return res.json({
    points: parseInt(points || '0'),
    streak: parseInt(streak || '0'),
    invites: parseInt(invites || '0'),
    checkedInToday: !!checkedIn,
    paidToday: !!hasPaid
  });
}
