import { redis } from './_redis.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const body = req.method === 'POST' ? req.body : req.query;
  const { fid, action } = body;
  if (!fid) return res.json({ error: 'No fid' });

  const today = new Date().toISOString().split('T')[0];
  const payKey = `paid:${fid}:${today}`;

  if (action === 'check') {
    const hasPaid = await redis('get', payKey);
    return res.json({ hasPaid: !!hasPaid });
  }
  if (action === 'set') {
    await redis('set', payKey, '1');
    await redis('expire', payKey, '86400');
    return res.json({ success: true });
  }
  return res.json({ error: 'Invalid action' });
}
