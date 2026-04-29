// Netlify Function — בודק אם משתמש דיסקורד חבר בשרת RealVardi
// משתמש במשתני סביבה: DISCORD_BOT_TOKEN, DISCORD_GUILD_ID

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed', exists: false }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    let raw = (body.username || '').trim();

    if (!raw) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'username required', exists: false }),
      };
    }

    // ניקוי קלט
    let username = raw.replace(/^@/, '').toLowerCase();
    // פורמט ישן username#0000 — לוקחים רק את החלק שלפני ה-#
    const oldMatch = username.match(/^(.+?)#\d{2,5}$/);
    if (oldMatch) username = oldMatch[1];
    // הסרת רווחים (Discord usernames don't contain spaces)
    username = username.replace(/\s+/g, '');

    if (!username) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'invalid username', exists: false }),
      };
    }

    const guildId = process.env.DISCORD_GUILD_ID;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!guildId || !botToken) {
      console.error('Missing env vars: DISCORD_GUILD_ID or DISCORD_BOT_TOKEN');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'server not configured', exists: false }),
      };
    }

    // Discord member search — searches by username/nick prefix
    const apiUrl = `https://discord.com/api/v10/guilds/${guildId}/members/search?query=${encodeURIComponent(username)}&limit=100`;

    const res = await fetch(apiUrl, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('Discord API error:', res.status, errText);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: 'discord api error', exists: false }),
      };
    }

    const members = await res.json();

    // התאמה מדויקת (לא prefix) על אחד מהשדות הבאים: username / global_name / nick
    const found = Array.isArray(members) && members.some((m) => {
      const u = m.user || {};
      const candidates = [u.username, u.global_name, m.nick]
        .filter(Boolean)
        .map((s) => String(s).toLowerCase().replace(/\s+/g, ''));
      return candidates.includes(username);
    });

    // ===== בדיקה אם המשתמש כבר רשום בנטליפיי פורמס =====
    let alreadyRegistered = false;
    const netlifyToken = process.env.NETLIFY_TOKEN;
    const siteId = process.env.NETLIFY_SITE_ID;

    if (netlifyToken && siteId) {
      try {
        // נדפדף עד 1000 הרשמות (10 דפים × 100)
        for (let page = 1; page <= 10; page++) {
          const subUrl = `https://api.netlify.com/api/v1/sites/${siteId}/submissions?per_page=100&page=${page}`;
          const subRes = await fetch(subUrl, {
            headers: { Authorization: `Bearer ${netlifyToken}` },
          });
          if (!subRes.ok) {
            console.error('Netlify API error:', subRes.status);
            break;
          }
          const submissions = await subRes.json();
          if (!Array.isArray(submissions) || submissions.length === 0) break;

          const match = submissions.some((sub) => {
            const data = sub.data || {};
            const subDiscord = String(data.discord || '')
              .trim()
              .toLowerCase()
              .replace(/^@/, '')
              .replace(/^(.+?)#\d{2,5}$/, '$1')
              .replace(/\s+/g, '');
            return subDiscord && subDiscord === username;
          });
          if (match) {
            alreadyRegistered = true;
            break;
          }
          if (submissions.length < 100) break; // אין עוד דפים
        }
      } catch (err) {
        console.error('Failed checking duplicates:', err.message);
      }
    } else {
      console.warn('NETLIFY_TOKEN or NETLIFY_SITE_ID missing — skipping duplicate check');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ exists: found, alreadyRegistered, query: username }),
    };
  } catch (err) {
    console.error('Function exception:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'internal error', exists: false, alreadyRegistered: false }),
    };
  }
};
