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

  const body = req.method === 'POST' ? req.body : req.query;
  const { fid, action, inviteCode } = body;

  // Generate invite code for a user
  if (action === 'generate') {
    const code = `PJ-${fid}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    await redis('set', `invite:code:${code}`, fid.toString());
    await redis('set', `invite:fid:${fid}`, code);
    return res.json({ code, link: `https://pudgy-play.vercel.app?ref=${code}` });
  }

  // Get existing code
  if (action === 'get') {
    const code = await redis('get', `invite:fid:${fid}`);
    if (code) return res.json({ code, link: `https://pudgy-play.vercel.app?ref=${code}` });
    // Auto generate if none
    const newCode = `PJ-${fid}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    await redis('set', `invite:code:${newCode}`, fid.toString());
    await redis('set', `invite:fid:${fid}`, newCode);
    return res.json({ code: newCode, link: `https://pudgy-play.vercel.app?ref=${newCode}` });
  }

  // Use invite code (new user joins via ref link)
  if (action === 'use' && inviteCode) {
    const referrerFid = await redis('get', `invite:code:${inviteCode}`);
    if (!referrerFid) return res.json({ error: 'Invalid code' });
    if (referrerFid === fid) return res.json({ error: 'Cannot use own code' });

    const alreadyUsed = await redis('get', `invite:used:${fid}`);
    if (alreadyUsed) return res.json({ error: 'Already used an invite' });

    await redis('set', `invite:used:${fid}`, inviteCode);
    await redis('incrby', `points:${referrerFid}`, '150'); // 150 pts to referrer
    await redis('incrby', `points:${fid}`, '50'); // 50 pts to new user
    await redis('incrby', `invites:${referrerFid}`, '1');

    return res.json({ success: true, bonusPoints: 50 });
  }

  // Get invite stats
  if (action === 'stats') {
    const code = await redis('get', `invite:fid:${fid}`);
    const inviteCount = await redis('get', `invites:${fid}`) || '0';
    return res.json({ code, inviteCount: parseInt(inviteCount) });
  }

  return res.json({ error: 'Invalid action' });
}
