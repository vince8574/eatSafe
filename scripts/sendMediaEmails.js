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
// FROM utilise le sous-domaine vérifié dans Resend (send.numeline.com).
// REPLY_TO pointe vers la vraie boîte mail pour recevoir les réponses.
const FROM = 'Vincent Gaillard <contact@send.numeline.com>';
const REPLY_TO = 'contact@numeline.com';
const SUBJECT = 'An innovation that could change food recall management in the United States';
const POSTAL_ADDRESS = '1620 route des Alpes du Léman, 74420 Villard, France';
const UNSUBSCRIBE_MAILTO = 'mailto:contact@numeline.com?subject=Unsubscribe';
const MIN_DELAY_MS = 30_000;  // 30s
const MAX_DELAY_MS = 60_000;  // 60s
const HEADER_CID = 'numeline-header';
const HEADER_IMAGE_FILENAME = 'numeline-header.png';

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

  // Replace inlined base64 image with CID reference (image attached separately)
  html = html.replace(/src="data:image\/png;base64,[A-Za-z0-9+/=]+"/, `src="cid:${HEADER_CID}"`);

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

Every year in the United States, many food products are recalled. Apps that scan barcodes exist today, but they remain rudimentary — the burden of manually verifying lot numbers (and the risk of mistakes) still falls on users.

This is why we developed Numeline, an Android and iOS app that centralizes official FDA and USDA FSIS recall data and lets anyone instantly check a lot number with a scan. It transforms access to recall information from a slow, fragmented system into a fast, everyday tool.

Numeline is also designed for any business handling food: restaurants, hotels, cinemas, daycares, distributors. I think this innovation could interest your readers in coverage of public health and consumer technology.

I'd be happy to share additional materials and provide trial access if you'd like to test it.

Discover Numeline → https://numeline.com

—
Sofia Ait-Bahate & Vincent Gaillard
Numeline — Food Recall Scanner
https://numeline.com · contact@numeline.com

You're receiving this because you cover food, health, or wellness in the US press. To unsubscribe, reply with "unsubscribe".
Numeline · ${POSTAL_ADDRESS}
`;
}

// --- Resend REST API ---
function sendEmail({ apiKey, to, html, text, headerImageBase64 }) {
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
      },
      attachments: [{
        filename: HEADER_IMAGE_FILENAME,
        content: headerImageBase64,
        content_id: HEADER_CID,
        content_type: 'image/png'
      }]
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
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey && !dryRun) {
    log('❌ RESEND_API_KEY manquante (env ou .env)', 'red');
    process.exit(1);
  }

  const csvPath = path.join(__dirname, 'output', 'media-contacts.csv');
  const templatePath = path.join(__dirname, '..', 'public', 'email-template.html');
  const headerImagePath = path.join(__dirname, '..', 'public', 'numeline-email-header.png');
  const sentPath = path.join(__dirname, 'output', 'sent.json');

  if (!fs.existsSync(templatePath)) { log(`❌ Template introuvable: ${templatePath}`, 'red'); process.exit(1); }
  if (!fs.existsSync(headerImagePath)) { log(`❌ Image header introuvable: ${headerImagePath}`, 'red'); process.exit(1); }

  const template = fs.readFileSync(templatePath, 'utf8');
  const headerImageBase64 = fs.readFileSync(headerImagePath).toString('base64');

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
      const res = await sendEmail({ apiKey, to: testEmail, html, text, headerImageBase64 });
      log(`✓ envoyé — id: ${res.id || 'unknown'}`, 'green');
    } catch (err) {
      log(`✗ échec: ${err.message}`, 'red');
      process.exit(1);
    }
    return;
  }

  if (!fs.existsSync(csvPath)) { log(`❌ CSV introuvable: ${csvPath}`, 'red'); process.exit(1); }

  const contacts = parseCSV(fs.readFileSync(csvPath, 'utf8'));
  const sent = fs.existsSync(sentPath) ? JSON.parse(fs.readFileSync(sentPath, 'utf8')) : {};

  const toSend = contacts.filter((c) => {
    const e = (c.email || '').trim().toLowerCase();
    return e && !sent[e];
  });

  log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'gray');
  log(`📋 ${contacts.length} contacts dans le CSV`, 'cyan');
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
    if (sent[email]) { log(`  skip ${email} (déjà envoyé)`, 'gray'); continue; }

    const html = buildHtml(template, contact);
    const text = buildText(contact);

    log(`\n→ ${email} (${contact.media || ''} — ${contact.position || ''})`, 'cyan');
    if (dryRun) {
      log(`  [dry-run] taille HTML: ${html.length} chars`, 'gray');
      sentCount++;
      continue;
    }

    try {
      const res = await sendEmail({ apiKey, to: email, html, text, headerImageBase64 });
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
