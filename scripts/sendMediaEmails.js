#!/usr/bin/env node
/**
 * Envoie le pitch Numeline aux contacts récupérés via Hunter.io.
 *
 * - Lit scripts/output/media-contacts.csv
 * - Utilise public/email-template.html comme HTML de base
 * - Personnalise: Hello, → Hi {first_name},
 * - Injecte un footer CAN-SPAM (adresse + désinscription)
 * - Envoie un par un via Resend, avec délai aléatoire entre envois
 * - Log dans scripts/output/sent.json (skippe les emails déjà envoyés)
 *
 * Usage:
 *   1) Test sur ton propre email (TEST_EMAIL dans .env):
 *      node scripts/sendMediaEmails.js --test
 *   2) Dry-run (preview sans envoi):
 *      node scripts/sendMediaEmails.js --dry-run
 *   3) Envoi limité (5 premiers contacts):
 *      node scripts/sendMediaEmails.js --limit=5
 *   4) Envoi complet:
 *      node scripts/sendMediaEmails.js
 *   5) Renvoyer le nouveau template à tous les contacts déjà contactés:
 *      node scripts/sendMediaEmails.js --resend
 *      (skips unsubscribed + already-resent, tracks in sent-resend.json)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', cyan: '\x1b[36m', gray: '\x1b[90m'
};
const log = (msg, c = 'reset') => console.log(`${colors[c]}${msg}${colors.reset}`);

// --- Config ---
// FROM utilise le sous-domaine vérifié dans Resend (numeline.com).
// REPLY_TO pointe vers la vraie boîte mail pour recevoir les réponses.
const FROM = 'Vincent Gaillard <vincent@numeline.com>';
const REPLY_TO = 'vincent@numeline.com';
const SUBJECT = '6 listeria deaths, 0 lot-level recall alerts';
const POSTAL_ADDRESS = '1620 route des Alpes du Léman, 74420 Villard, France';
const UNSUBSCRIBE_MAILTO = 'mailto:vincent@numeline.com?subject=Unsubscribe';
const MIN_DELAY_MS = 30_000;  // 30s
const MAX_DELAY_MS = 60_000;  // 60s

// --- Env ---
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return;
    const eq = t.indexOf('=');
    if (eq === -1) return;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  });
}

// --- CSV parsing (handles quoted fields with commas) ---
function parseCSV(text) {
  const rows = [];
  let cur = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { cur.push(field); field = ''; }
      else if (ch === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
      else if (ch === '\r') { /* skip */ }
      else field += ch;
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  if (rows.length === 0) return [];
  const header = rows[0];
  return rows.slice(1).filter((r) => r.length === header.length).map((r) => {
    const obj = {};
    header.forEach((h, i) => obj[h] = r[i]);
    return obj;
  });
}

// --- Template personalisation ---
function buildHtml(template, contact) {
  const firstName = (contact.first_name || '').trim();
  const greeting = firstName ? `Hi ${firstName},` : 'Hello,';

  // Replace greeting
  let html = template.replace(/>\s*Hello,\s*</, `>${greeting}<`);

  // Inject CAN-SPAM footer before </table> (closing card table) — find last footer <tr>
  const footerHtml = `
          <!-- CAN-SPAM compliance footer -->
          <tr>
            <td style="padding:16px 48px 24px;background-color:#f7faf9;">
              <p style="margin:0 0 6px;font-size:11px;color:#7a8a8a;line-height:1.5;">
                You're receiving this email because you cover food, health, or wellness in the US press. If you'd rather not hear from us again, just reply with "unsubscribe" or click <a href="${UNSUBSCRIBE_MAILTO}" style="color:#0bae86;">here</a>.
              </p>
              <p style="margin:0;font-size:11px;color:#7a8a8a;line-height:1.5;">
                Numeline · ${POSTAL_ADDRESS}
              </p>
            </td>
          </tr>
`;
  // Insert before the closing </table> of the card (line ~90: just before `</table>` followed by `<!-- /Card -->`)
  html = html.replace(/(\s*<\/table>\s*<!-- \/Card -->)/, `${footerHtml}$1`);

  return html;
}

function buildText(contact) {
  const firstName = (contact.first_name || '').trim();
  const greeting = firstName ? `Hi ${firstName},` : 'Hello,';
  return `${greeting}

In June 2025, Nate's Fine Foods recalled pre-cooked pasta sold at Trader Joe's, Walmart, and Kroger. Before the shelves were emptied, listeria had already killed 6 people and hospitalized 25 across 18 states. Most consumers — and most existing recall apps — only see brand-level alerts. The actual lot numbers, where the contamination lives, slip through.

That's the gap Numeline closes. It's a mobile scanner (iOS + Android) that reads the lot number directly from a package and cross-checks it in real time against FDA and USDA FSIS recall data. Lot-level, not brand-level. Same-day, not next-week.

A second angle that may interest your readers: Numeline is also designed for visually impaired users, with voice guidance and automatic lot-number detection by camera — making food safety verification accessible to people who can't read the fine print on packaging.

I'd be glad to send you a press kit (high-res screenshots, demo video, founder bios) or give you free trial access if you'd like to test the app yourself.

Would either of those work for your beat?

—
Vincent Gaillard & Sofia Ait-Bahate
Numeline — Food Recall Scanner
https://numeline.com · vincent@numeline.com

You're receiving this because you cover food, health, or wellness in the US press. To unsubscribe, reply with "unsubscribe".
Numeline · ${POSTAL_ADDRESS}
`;
}

// --- Resend REST API ---
function sendEmail({ apiKey, to, html, text }) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      from: FROM,
      to: [to],
      reply_to: REPLY_TO,
      subject: SUBJECT,
      html,
      text,
      headers: {
        'List-Unsubscribe': `<${UNSUBSCRIBE_MAILTO}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
      }
    });

    const req = https.request({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(body)); } catch { resolve({ raw: body }); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randDelay = () => MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);

// --- Main ---
async function main() {
  loadEnv();
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const testMode = args.includes('--test');
  const resendMode = args.includes('--resend');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;
  const unsubscribeArg = args.find((a) => a.startsWith('--unsubscribe='));

  const csvPath = path.join(__dirname, 'output', 'media-contacts-scraped.csv');
  const templatePath = path.join(__dirname, '..', 'public', 'email-template-press.html');
  const sentPath = path.join(__dirname, 'output', 'sent.json');
  const sentResendPath = path.join(__dirname, 'output', 'sent-resend.json');
  const unsubscribedPath = path.join(__dirname, 'output', 'unsubscribed.json');

  const unsubscribed = fs.existsSync(unsubscribedPath) ? JSON.parse(fs.readFileSync(unsubscribedPath, 'utf8')) : {};

  // --unsubscribe=email : ajoute à la liste et quitte
  if (unsubscribeArg) {
    const email = unsubscribeArg.split('=')[1].trim().toLowerCase();
    if (!email) { log('❌ Email manquant : --unsubscribe=email@example.com', 'red'); process.exit(1); }
    unsubscribed[email] = { unsubscribedAt: new Date().toISOString() };
    fs.writeFileSync(unsubscribedPath, JSON.stringify(unsubscribed, null, 2));
    log(`✓ ${email} ajouté à la liste des désinscrits`, 'green');
    log(`📁 ${unsubscribedPath}`, 'gray');
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey && !dryRun) {
    log('❌ RESEND_API_KEY manquante (env ou .env)', 'red');
    process.exit(1);
  }

  if (!fs.existsSync(templatePath)) { log(`❌ Template introuvable: ${templatePath}`, 'red'); process.exit(1); }

  const template = fs.readFileSync(templatePath, 'utf8');

  // --test: send only to TEST_EMAIL (or arg after --test)
  if (testMode) {
    const testEmail = process.env.TEST_EMAIL;
    if (!testEmail) {
      log('❌ Mode --test: définis TEST_EMAIL=ton@email.com dans .env', 'red');
      process.exit(1);
    }
    const fakeContact = { first_name: 'Vincent', email: testEmail, media: 'TEST', position: 'self-test' };
    const html = buildHtml(template, fakeContact);
    const text = buildText(fakeContact);
    log(`\n🧪 Mode TEST → envoi à ${testEmail}`, 'yellow');
    log(`   (vérifie le rendu Gmail + Outlook avant de lancer le bulk)`, 'gray');
    try {
      const res = await sendEmail({ apiKey, to: testEmail, html, text });
      log(`✓ envoyé — id: ${res.id || 'unknown'}`, 'green');
    } catch (err) {
      log(`✗ échec: ${err.message}`, 'red');
      process.exit(1);
    }
    return;
  }

  if (!fs.existsSync(csvPath)) { log(`❌ CSV introuvable: ${csvPath}`, 'red'); process.exit(1); }

  const allContacts = parseCSV(fs.readFileSync(csvPath, 'utf8'));

  // --resend: re-envoyer le nouveau template à tous les contacts déjà contactés
  if (resendMode) {
    const sent = fs.existsSync(sentPath) ? JSON.parse(fs.readFileSync(sentPath, 'utf8')) : {};
    const sentResend = fs.existsSync(sentResendPath) ? JSON.parse(fs.readFileSync(sentResendPath, 'utf8')) : {};

    // Build contactMap from CSV for first-name lookup
    const contactMap = {};
    for (const c of allContacts) {
      const e = (c.email || '').trim().toLowerCase();
      if (e) contactMap[e] = c;
    }

    const targets = Object.keys(sent).filter((e) => !unsubscribed[e] && !sentResend[e]);
    const toResend = limit < Infinity ? targets.slice(0, limit) : targets;

    log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'gray');
    log(`🔁 Mode --resend`, 'cyan');
    log(`🚫 ${Object.keys(unsubscribed).length} désinscrits (skip)`, 'yellow');
    log(`✅ ${Object.keys(sentResend).length} déjà re-envoyés (skip)`, 'gray');
    log(`📤 ${toResend.length} à re-envoyer maintenant`, 'cyan');
    log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'gray');

    if (dryRun) {
      log('🧪 DRY RUN — aucun envoi réel\n', 'yellow');
      for (const email of toResend) {
        const contact = contactMap[email] || {};
        const firstName = (contact.first_name || '').trim();
        log(`  [dry-run] → ${email}${firstName ? ' (' + firstName + ')' : ''}`, 'gray');
      }
      return;
    }

    log(`\n⚠  Envoi réel dans 5 secondes... (Ctrl+C pour annuler)`, 'yellow');
    for (let i = 5; i > 0; i--) {
      process.stdout.write(`\r   ${i}...  `);
      await sleep(1000);
    }
    process.stdout.write('\r            \r');

    let sentCount = 0, failCount = 0, consecutiveFails = 0;

    for (const email of toResend) {
      if (consecutiveFails >= 3) { log(`\n⏹  3 échecs consécutifs — arrêt`, 'red'); break; }

      const contact = contactMap[email] || {};
      const html = buildHtml(template, contact);
      const text = buildText(contact);
      const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
      log(`\n→ ${email}${fullName ? ' (' + fullName + ')' : ''}`, 'cyan');

      try {
        const res = await sendEmail({ apiKey, to: email, html, text });
        log(`  ✓ envoyé — id: ${res.id || 'unknown'}`, 'green');
        sentResend[email] = { sentAt: new Date().toISOString(), messageId: res.id || null };
        fs.writeFileSync(sentResendPath, JSON.stringify(sentResend, null, 2));
        sentCount++;
        consecutiveFails = 0;
      } catch (err) {
        log(`  ✗ échec: ${err.message}`, 'red');
        failCount++;
        consecutiveFails++;
        continue;
      }

      const delay = randDelay();
      log(`  ⏱  pause ${Math.round(delay / 1000)}s avant le suivant...`, 'gray');
      await sleep(delay);
    }

    log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'gray');
    log(`✓ re-envoyés: ${sentCount}`, 'green');
    if (failCount) log(`✗ échecs: ${failCount}`, 'red');
    log(`📁 log: ${sentResendPath}`, 'cyan');
    return;
  }
  const sent = fs.existsSync(sentPath) ? JSON.parse(fs.readFileSync(sentPath, 'utf8')) : {};

  // Garder kind=personal + kind=maybe_personal, exclure generic/unknown/press_generic
  const personalContacts = allContacts.filter((c) => {
    const kind = (c.kind || '').trim().toLowerCase();
    return kind === 'personal' || kind === 'maybe_personal';
  });

  // Filtre additionnel : exclure les patterns génériques (départements, exemples, faux positifs scraping)
  const EMAIL_BAD_PATTERNS = [
    'firstname.lastname', '_relations', '_licensing', '_administration', '_shouts',
    '_inquiries', 'investor', 'privacy', 'legal@', 'careers@', 'subscriptions',
    'support@', 'noreply', 'no-reply', 'webmaster', 'postmaster', 'admin@',
    'info@', 'contact@', 'press@', 'pr@', 'media@', 'editor@', 'editorial@',
    'newsletter', 'feedback', 'help@', 'sales@', 'marketing@', 'advertising',
    'commsdept', 'studiosdevelopment', 'tips@', 'news@', 'office@'
  ];
  const FIRSTNAME_BAD = new Set([
    'investor', 'image', 'privacy', 'readers', 'firstname', 'press', 'media',
    'commsdept', 'studiosdevelopment', 'tips', 'feedback', 'guides', 'find',
    'atcomments', 'engagement', 'bestthingstodo', 'events', 'partnerships',
    'laistinternships', 'online', 'support', 'and', 'careers', 'subscriptions',
    'legal', 'editor', 'editorial', 'news', 'office', 'admin', 'info', 'contact',
    'newsletter', 'help', 'sales', 'marketing', 'advertising', 'pr', 'communications',
    'tny', 'sarah', // 'sarah' alone is too generic — false positives like "sarah.media"
  ]);

  const contacts = personalContacts.filter((c) => {
    const email = (c.email || '').trim().toLowerCase();
    const firstName = (c.first_name || '').trim().toLowerCase();
    if (!email) return false;
    // Exclure si l'email contient un pattern générique
    if (EMAIL_BAD_PATTERNS.some((p) => email.includes(p))) return false;
    // Exclure si le first_name est une étiquette générique (et pas un vrai prénom)
    if (FIRSTNAME_BAD.has(firstName)) return false;
    // Exiger un last_name non vide (vrai journaliste = prénom + nom)
    const lastName = (c.last_name || '').trim();
    if (!lastName) return false;
    return true;
  });

  const toSend = contacts.filter((c) => {
    const e = (c.email || '').trim().toLowerCase();
    return e && !sent[e];
  });

  log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'gray');
  log(`📋 ${allContacts.length} contacts CSV → ${personalContacts.length} (kind=personal) → ${contacts.length} après filtre anti-générique`, 'cyan');
  log(`🚫 ${Object.keys(unsubscribed).length} désinscrits (skip)`, 'yellow');
  log(`✉️  ${Object.keys(sent).length} déjà envoyés (skip)`, 'gray');
  log(`📤 ${Math.min(toSend.length, limit)} à envoyer maintenant`, 'cyan');
  log(`📨 From: ${FROM}`, 'gray');
  log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'gray');

  if (dryRun) {
    log('🧪 DRY RUN — aucun envoi réel\n', 'yellow');
  } else {
    log(`\n⚠  Envoi réel dans 5 secondes... (Ctrl+C pour annuler)`, 'yellow');
    for (let i = 5; i > 0; i--) {
      process.stdout.write(`\r   ${i}...  `);
      await sleep(1000);
    }
    process.stdout.write('\r            \r');
  }

  let sentCount = 0, failCount = 0, consecutiveFails = 0;

  for (const contact of contacts) {
    if (sentCount >= limit) { log(`\n⏹  Limite ${limit} atteinte`, 'yellow'); break; }
    if (consecutiveFails >= 3) { log(`\n⏹  3 échecs consécutifs — arrêt`, 'red'); break; }

    const email = (contact.email || '').trim().toLowerCase();
    if (!email) continue;
    if (unsubscribed[email]) { log(`  skip ${email} (désinscrit)`, 'yellow'); continue; }
    if (sent[email]) { log(`  skip ${email} (déjà envoyé)`, 'gray'); continue; }

    const html = buildHtml(template, contact);
    const text = buildText(contact);

    const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
    log(`\n→ ${email} (${contact.media || ''}${fullName ? ' — ' + fullName : ''})`, 'cyan');
    if (dryRun) {
      log(`  [dry-run] taille HTML: ${html.length} chars`, 'gray');
      sentCount++;
      continue;
    }

    try {
      const res = await sendEmail({ apiKey, to: email, html, text });
      log(`  ✓ envoyé — id: ${res.id || 'unknown'}`, 'green');
      sent[email] = { sentAt: new Date().toISOString(), messageId: res.id || null, media: contact.media };
      fs.writeFileSync(sentPath, JSON.stringify(sent, null, 2));
      sentCount++;
      consecutiveFails = 0;
    } catch (err) {
      log(`  ✗ échec: ${err.message}`, 'red');
      failCount++;
      consecutiveFails++;
      continue;
    }

    const delay = randDelay();
    log(`  ⏱  pause ${Math.round(delay / 1000)}s avant le suivant...`, 'gray');
    await sleep(delay);
  }

  log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'gray');
  log(`✓ envoyés: ${sentCount}`, 'green');
  if (failCount) log(`✗ échecs: ${failCount}`, 'red');
  log(`📁 log: ${sentPath}`, 'cyan');
}

main().catch((err) => { log(`\n❌ ${err.message}`, 'red'); process.exit(1); });
