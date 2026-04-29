// Netlify Function — קאונטר ביקורים מאוחסן ב-Netlify Blobs
// בכל קריאה: מקדם את המונה ב-1 ומחזיר את הערך הנוכחי

const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const store = getStore({ name: 'vegas-counter', consistency: 'strong' });
    const current = await store.get('visits');
    const count = (parseInt(current, 10) || 0) + 1;
    await store.set('visits', String(count));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ count }),
    };
  } catch (err) {
    console.error('Visits function error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ count: null, error: err.message }),
    };
  }
};
