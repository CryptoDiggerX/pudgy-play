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

  // GET leaderboard
  if (req.method === 'GET') {
    const raw = await redis('zrevrange', 'leaderboard', '0', '9', 'WITHSCORES');
    const entries = [];
    if (raw) {
      for (let i = 0; i < raw.length; i += 2) {
        entries.push({ name: raw[i], score: parseInt(raw[i + 1]) });
      }
    }
    return res.json({ leaderboard: entries });
  }

  // POST save score
  if (req.method === 'POST') {
    const { fid, username, score } = req.body;
    if (!fid || !score) return res.json({ error: 'Missing data' });

    const name = username || `fid:${fid}`;
    const numScore = parseInt(score);

    // Update leaderboard (sorted set — keeps highest score)
    const current = await redis('zscore', 'leaderboard', name);
    if (!current || numScore > parseInt(current)) {
      await redis('zadd', 'leaderboard', numScore.toString(), name);
    }

    // Add airdrop points based on score
    const earnedPoints = Math.floor(numScore / 10);
    await redis('incrby', `points:${fid}`, earnedPoints.toString());
    const totalPoints = await redis('get', `points:${fid}`);

    return res.json({ success: true, earnedPoints, totalPoints: parseInt(totalPoints) });
  }

  return res.json({ error: 'Method not allowed' });
}
