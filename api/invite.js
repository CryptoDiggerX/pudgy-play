import { redis } from './_redis.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const body = req.method === 'POST' ? req.body : req.query;
  const { fid, action, inviteCode } = body;

  if (action === 'get' || action === 'generate') {
    let code = await redis('get', `invite:fid:${fid}`);
    if (!code) {
      code = `PJ-${fid}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      await redis('set', `invite:code:${code}`, fid.toString());
      await redis('set', `invite:fid:${fid}`, code);
    }
    const inviteCount = await redis('get', `invites:${fid}`) || '0';
    return res.json({ code, link: `https://pudgy-play.vercel.app?ref=${code}`, inviteCount: parseInt(inviteCount) });
  }

  if (action === 'use' && inviteCode) {
    const referrerFid = await redis('get', `invite:code:${inviteCode}`);
    if (!referrerFid) return res.json({ error: 'Invalid code' });
    if (String(referrerFid) === String(fid)) return res.json({ error: 'Cannot use own code' });
    const alreadyUsed = await redis('get', `invite:used:${fid}`);
    if (alreadyUsed) return res.json({ error: 'Already used' });
    await redis('set', `invite:used:${fid}`, inviteCode);
    await redis('incrby', `points:${referrerFid}`, '150');
    await redis('incrby', `points:${fid}`, '50');
    await redis('incrby', `invites:${referrerFid}`, '1');
    return res.json({ success: true, bonusPoints: 50 });
  }

  return res.json({ error: 'Invalid action' });
}
