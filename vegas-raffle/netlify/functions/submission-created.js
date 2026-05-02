// Netlify Function — מופעל אוטומטית בכל הרשמה לטופס
// שולח 2 מיילים: לנרשם (אישור) + ל-info@therealvardi.com (התראה)

exports.handler = async (event) => {
  try {
    const payload = JSON.parse(event.body || '{}');
    const data = (payload.payload && payload.payload.data) || {};

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('Missing RESEND_API_KEY env var');
      return { statusCode: 500, body: 'Missing API key' };
    }

    // חילוץ שדות
    const firstName = data.firstName || '';
    const lastName = data.lastName || '';
    const email = data.email || '';
    const phone = data.phone || '';
    const phoneCountry = data.phoneCountry || '';
    const phoneFull = data.phoneFull || `${phoneCountry} ${phone}`.trim();
    const discord = data.discord || '';
    const dob = data.dob || '';
    const country = data.country || '';
    const usEntry = data.usEntry || '';
    const agreeRules = data.agreeRules || '';
    const agreeTerms = data.agreeTerms || '';
    const agreeMarketing = data.agreeMarketing || '';

    // חישוב גיל בצד השרת (לוודאות, גם אם לא נשלח מהפרונטאנד)
    let calculatedAge = data.calculatedAge || '';
    if (dob) {
      try {
        const dobDate = new Date(dob);
        if (!isNaN(dobDate)) {
          const today = new Date();
          let age = today.getFullYear() - dobDate.getFullYear();
          const m = today.getMonth() - dobDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) age--;
          calculatedAge = String(age);
        }
      } catch (e) {
        console.warn('Failed to compute age:', e.message);
      }
    }

    const fullName = `${firstName} ${lastName}`.trim();
    const usEntryLabel = {
      esta: 'ESTA תקף',
      visa: 'ויזה אמריקאית תקפה',
      passport: 'דרכון אמריקאי',
      none: 'אין כרגע — ידאג לפני המסע',
    }[usEntry] || usEntry;

    // ====== מייל 1: לנרשם ======
    const userEmailHtml = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"><title>ההרשמה התקבלה</title></head>
<body style="margin:0; padding:0; background:#0a0014; font-family:'Heebo',Arial,sans-serif;">
  <div style="max-width:600px; margin:0 auto; padding:30px 20px;">
    <div style="background:linear-gradient(160deg,#14081f,#1a0c2a); padding:40px 28px; border-radius:18px; border:1px solid rgba(187,121,255,0.3); color:#fff;">

      <div style="text-align:center; margin-bottom:24px;">
        <div style="display:inline-block; padding:8px 18px; background:rgba(255,216,77,0.12); border:1px solid rgba(255,216,77,0.4); border-radius:100px; color:#ffd84d; font-size:13px; font-weight:700; letter-spacing:0.06em;">
          ✅ ההרשמה התקבלה
        </div>
      </div>

      <h1 style="font-size:32px; font-weight:900; margin:0 0 18px; line-height:1.2; color:#fff;">
        היי ${escapeHtml(firstName)} 🎰
      </h1>

      <p style="font-size:17px; line-height:1.6; color:#d8c9f0; margin:0 0 14px;">
        תודה שנרשמת ל<strong style="color:#fff">הגרלת וגאס הגדולה</strong> של RealVardi.
      </p>
      <p style="font-size:17px; line-height:1.6; color:#d8c9f0; margin:0 0 24px;">
        ההרשמה שלך נקלטה במערכת בהצלחה ✨
      </p>

      <div style="background:rgba(126,0,255,0.18); border:1px solid rgba(187,121,255,0.4); border-radius:12px; padding:20px; margin-bottom:28px;">
        <p style="margin:0 0 6px; color:#ffd84d; font-weight:800; font-size:15px;">📅 מועד ההגרלה</p>
        <p style="margin:0 0 14px; color:#fff; font-size:18px; font-weight:700;">2 ביולי 2026</p>
        <p style="margin:0 0 6px; color:#ffd84d; font-weight:800; font-size:15px;">✈ תאריכי המסע</p>
        <p style="margin:0 0 14px; color:#fff; font-size:18px; font-weight:700;">16–20 באוגוסט 2026</p>
        <p style="margin:0 0 6px; color:#ffd84d; font-weight:800; font-size:15px;">📣 הזוכה יוכרז</p>
        <p style="margin:0; color:#fff; font-size:16px;">בשידור לייב בדיסקורד של הקהילה</p>
      </div>

      <h3 style="color:#bb79ff; margin:24px 0 12px; font-size:18px;">תזכורת חשובה ⚠️</h3>
      <p style="color:#d8c9f0; line-height:1.6; margin:0 0 12px;">
        לפני הכרזת הזוכה, אנחנו מאמתים שכל המשתתפים והמשתתפות ביצעו את 8 שלבי ההשתתפות. וודא/י ש:
      </p>
      <ul style="color:#d8c9f0; line-height:1.9; padding-right:20px; margin:0 0 24px;">
        <li>את/ה עוקב/ת אחרי <strong>@realvardi</strong> ו-<strong>@zackvsnq</strong> באינסטגרם</li>
        <li>שיתפת את הפוסט בסטורי + תייגת אותנו</li>
        <li>לחצת לייק ושמרת את הפוסט</li>
        <li>תייגת 3 חברים בתגובה לפוסט</li>
        <li>את/ה חבר/ה בקהילת RealVardi דרך <a href="https://whop.com/la-traders" style="color:#ffd84d; font-weight:700;">Whop</a></li>
        <li>גיל 21+ עם ESTA או ויזה תקפים</li>
      </ul>

      <p style="color:#d8c9f0; margin:24px 0 4px;">בהצלחה,</p>
      <p style="color:#fff; font-weight:800; margin:0; font-size:17px;">ורדי & צחי</p>
      <p style="color:#a99bc4; margin:2px 0 0; font-size:14px;">RealVardi</p>

      <hr style="border:none; border-top:1px solid rgba(255,255,255,0.1); margin:30px 0 20px;">
      <p style="color:#a99bc4; font-size:12px; line-height:1.5; margin:0;">
        קיבלת את המייל הזה כי נרשמת ב-<a href="https://vegas.therealvardi.com" style="color:#bb79ff;">vegas.therealvardi.com</a>.<br>
        ההגרלה אינה ממומנת או מנוהלת על ידי Instagram, Meta או צד שלישי.
      </p>
    </div>
  </div>
</body>
</html>`;

    const userEmailText = `היי ${firstName}!

תודה שנרשמת להגרלת וגאס הגדולה של RealVardi.
ההרשמה שלך נקלטה במערכת בהצלחה.

מועד ההגרלה: 2 ביולי 2026
תאריכי המסע: 16–20 באוגוסט 2026
הזוכה יוכרז בשידור לייב בדיסקורד של הקהילה.

תזכורת — לפני הכרזת הזוכה אנחנו מאמתים שכל המשתתפים והמשתתפות ביצעו את 8 שלבי ההשתתפות.

בהצלחה,
ורדי & צחי
RealVardi
https://vegas.therealvardi.com`;

    // ====== מייל 2: התראה אדמין ל-info ======
    const adminEmailHtml = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"></head>
<body style="margin:0; padding:0; background:#f5f5f7; font-family:'Heebo',Arial,sans-serif;">
  <div style="max-width:640px; margin:0 auto; padding:24px;">
    <div style="background:#fff; padding:28px; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <div style="border-right:4px solid #7e00ff; padding-right:14px; margin-bottom:24px;">
        <h2 style="margin:0; color:#7e00ff; font-size:22px;">🎰 הרשמה חדשה להגרלה</h2>
        <p style="margin:4px 0 0; color:#666; font-size:14px;">vegas.therealvardi.com</p>
      </div>

      <table style="width:100%; border-collapse:collapse;">
        ${row('שם מלא', escapeHtml(fullName))}
        ${row('אימייל', `<a href="mailto:${escapeHtml(email)}" style="color:#7e00ff;">${escapeHtml(email)}</a>`)}
        ${row('טלפון', `<span style="direction:ltr; display:inline-block;">${escapeHtml(phoneFull)}</span>`)}
        ${row('דיסקורד', escapeHtml(discord))}
        ${row('תאריך לידה', escapeHtml(dob))}
        ${row('גיל מחושב', `<strong style="color:#7e00ff;">${escapeHtml(String(calculatedAge || '—'))}</strong>`)}
        ${row('מדינת מגורים', escapeHtml(country))}
        ${row('אישור כניסה לארה"ב', escapeHtml(usEntryLabel))}
      </table>

      <h3 style="margin:24px 0 8px; color:#333; font-size:15px;">הסכמות</h3>
      <ul style="margin:0; padding-right:18px; color:#555; line-height:1.8;">
        <li>ביצע 8 שלבי השתתפות: ${agreeRules ? '✅ כן' : '❌ לא'}</li>
        <li>אישר תקנון: ${agreeTerms ? '✅ כן' : '❌ לא'}</li>
        <li>שיווק: ${agreeMarketing ? '✅ כן' : '➖ לא'}</li>
      </ul>

      <hr style="border:none; border-top:1px solid #eee; margin:24px 0 16px;">
      <p style="color:#888; font-size:12px; margin:0;">
        ההרשמה גם נשמרה ב-Netlify Forms.
      </p>
    </div>
  </div>
</body>
</html>`;

    const adminEmailText = `הרשמה חדשה להגרלה — vegas.therealvardi.com

שם: ${fullName}
אימייל: ${email}
טלפון: ${phoneFull}
דיסקורד: ${discord}
תאריך לידה: ${dob}
גיל מחושב: ${calculatedAge || '—'}
מדינה: ${country}
אישור כניסה: ${usEntryLabel}

8 שלבים: ${agreeRules ? 'כן' : 'לא'}
תקנון: ${agreeTerms ? 'כן' : 'לא'}
שיווק: ${agreeMarketing ? 'כן' : 'לא'}`;

    // ====== שליחה ב-Resend ======
    const sendEmail = async (to, subject, html, text, replyTo) => {
      const body = {
        from: 'RealVardi <info@therealvardi.com>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
      };
      if (replyTo) body.reply_to = replyTo;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const txt = await res.text();
      if (!res.ok) {
        throw new Error(`Resend ${res.status}: ${txt}`);
      }
      return txt;
    };

    // מייל לנרשם
    if (email) {
      try {
        await sendEmail(
          email,
          '✅ ההרשמה שלך להגרלת וגאס התקבלה — RealVardi',
          userEmailHtml,
          userEmailText,
          'info@therealvardi.com'
        );
        console.log('User email sent to:', email);
      } catch (e) {
        console.error('Failed sending user email:', e.message);
      }
    }

    // מייל אדמין
    try {
      await sendEmail(
        'info@therealvardi.com',
        `📥 הרשמה חדשה: ${fullName}`,
        adminEmailHtml,
        adminEmailText,
        email || undefined
      );
      console.log('Admin email sent');
    } catch (e) {
      console.error('Failed sending admin email:', e.message);
    }

    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('submission-created error:', err);
    return { statusCode: 500, body: 'Error: ' + err.message };
  }
};

// === Helpers ===
function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function row(label, value) {
  return `<tr>
    <td style="padding:8px 0; color:#888; font-size:14px; width:140px; vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:8px 0; color:#222; font-size:15px; font-weight:600;">${value || '—'}</td>
  </tr>`;
}
