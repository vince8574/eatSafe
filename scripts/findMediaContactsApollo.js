#!/usr/bin/env node
/**
 * Récupère des journalistes US food/health/wellness via Apollo.io
 * et révèle les emails (consomme 1 crédit Apollo par révélation).
 *
 * Exclut tous les contacts déjà obtenus via Hunter.io
 * (scripts/output/media-contacts.csv) pour éviter les doublons.
 *
 * Usage:
 *   APOLLO_API_KEY=xxx node scripts/findMediaContactsApollo.js
 *   ou ajouter APOLLO_API_KEY=xxx dans .env
 *
 * Sorties:
 *   scripts/output/media-contacts-apollo.csv  (nouveaux contacts uniquement)
 *   scripts/output/apollo-skipped.csv         (doublons exclus, avec raison)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  });
}

// Mêmes domaines que findMediaContacts.js (Hunter) → on cherche les journalistes
// qui n'ont PAS été trouvés par Hunter sur ces médias.
const DOMAINS = [
  // === LA food / lifestyle ===
  { domain: 'latimes.com', label: 'Los Angeles Times', city: 'Los Angeles' },
  { domain: 'la.eater.com', label: 'Eater LA', city: 'Los Angeles' },
  { domain: 'lamag.com', label: 'Los Angeles Magazine', city: 'Los Angeles' },
  { domain: 'laist.com', label: 'LAist', city: 'Los Angeles' },
  { domain: 'laweekly.com', label: 'LA Weekly', city: 'Los Angeles' },
  { domain: 'theinfatuation.com', label: 'The Infatuation', city: 'Los Angeles' },
  { domain: 'tastemade.com', label: 'Tastemade', city: 'Santa Monica' },
  { domain: 'kcrw.com', label: 'KCRW (Good Food)', city: 'Santa Monica' },
  { domain: 'dailynews.com', label: 'LA Daily News', city: 'Los Angeles' },
  { domain: 'timeout.com', label: 'Time Out', city: 'Los Angeles' },
  { domain: 'goop.com', label: 'Goop', city: 'Santa Monica' },
  { domain: 'thechalkboardmag.com', label: 'The Chalkboard Mag', city: 'Los Angeles' },
  { domain: 'poosh.com', label: 'Poosh', city: 'Calabasas' },

  // === New York food / lifestyle / wellness ===
  { domain: 'nytimes.com', label: 'New York Times', city: 'New York' },
  { domain: 'newyorker.com', label: 'The New Yorker', city: 'New York' },
  { domain: 'nymag.com', label: 'New York Magazine / Grub Street', city: 'New York' },
  { domain: 'eater.com', label: 'Eater (national)', city: 'New York' },
  { domain: 'bonappetit.com', label: 'Bon Appétit', city: 'New York' },
  { domain: 'foodandwine.com', label: 'Food & Wine', city: 'New York' },
  { domain: 'epicurious.com', label: 'Epicurious', city: 'New York' },
  { domain: 'seriouseats.com', label: 'Serious Eats', city: 'New York' },
  { domain: 'thekitchn.com', label: 'The Kitchn', city: 'New York' },
  { domain: 'tastingtable.com', label: 'Tasting Table', city: 'New York' },
  { domain: 'delish.com', label: 'Delish', city: 'New York' },
  { domain: 'wellandgood.com', label: 'Well+Good', city: 'New York' },
  { domain: 'mindbodygreen.com', label: 'mindbodygreen', city: 'New York' },
  { domain: 'self.com', label: 'SELF', city: 'New York' },
  { domain: 'health.com', label: 'Health', city: 'New York' },
  { domain: 'shape.com', label: 'Shape', city: 'New York' },
  { domain: 'womenshealthmag.com', label: "Women's Health", city: 'New York' },
  { domain: 'menshealth.com', label: "Men's Health", city: 'New York' },
  { domain: 'prevention.com', label: 'Prevention', city: 'New York' },
  { domain: 'byrdie.com', label: 'Byrdie', city: 'New York' },
  { domain: 'foodnetwork.com', label: 'Food Network', city: 'New York' },

  // === Washington DC / national news ===
  { domain: 'washingtonpost.com', label: 'Washington Post', city: 'Washington DC' },
  { domain: 'wsj.com', label: 'Wall Street Journal', city: 'New York' },
  { domain: 'usatoday.com', label: 'USA Today', city: 'McLean VA' },
  { domain: 'cnn.com', label: 'CNN', city: 'Atlanta' },
  { domain: 'nbcnews.com', label: 'NBC News', city: 'New York' },
  { domain: 'cbsnews.com', label: 'CBS News', city: 'New York' },
  { domain: 'abcnews.go.com', label: 'ABC News', city: 'New York' },
  { domain: 'npr.org', label: 'NPR', city: 'Washington DC' },
  { domain: 'axios.com', label: 'Axios', city: 'Arlington VA' },
  { domain: 'politico.com', label: 'Politico', city: 'Arlington VA' },

  // === Chicago ===
  { domain: 'chicagotribune.com', label: 'Chicago Tribune', city: 'Chicago' },
  { domain: 'chicago.suntimes.com', label: 'Chicago Sun-Times', city: 'Chicago' },
  { domain: 'chicago.eater.com', label: 'Eater Chicago', city: 'Chicago' },
  { domain: 'timeoutchicago.com', label: 'Time Out Chicago', city: 'Chicago' },
  { domain: 'chicagomag.com', label: 'Chicago Magazine', city: 'Chicago' },

  // === San Francisco / Bay Area ===
  { domain: 'sfchronicle.com', label: 'San Francisco Chronicle', city: 'San Francisco' },
  { domain: 'sf.eater.com', label: 'Eater SF', city: 'San Francisco' },
  { domain: 'sfgate.com', label: 'SFGate', city: 'San Francisco' },
  { domain: 'sfweekly.com', label: 'SF Weekly', city: 'San Francisco' },

  // === Boston ===
  { domain: 'bostonglobe.com', label: 'Boston Globe', city: 'Boston' },
  { domain: 'boston.eater.com', label: 'Eater Boston', city: 'Boston' },
  { domain: 'bostonmagazine.com', label: 'Boston Magazine', city: 'Boston' },

  // === Miami ===
  { domain: 'miamiherald.com', label: 'Miami Herald', city: 'Miami' },
  { domain: 'miaminewtimes.com', label: 'Miami New Times', city: 'Miami' },
  { domain: 'miami.eater.com', label: 'Eater Miami', city: 'Miami' },

  // === Houston / Dallas / Austin ===
  { domain: 'houstonchronicle.com', label: 'Houston Chronicle', city: 'Houston' },
  { domain: 'dallasnews.com', label: 'Dallas Morning News', city: 'Dallas' },
  { domain: 'statesman.com', label: 'Austin American-Statesman', city: 'Austin' },
  { domain: 'austin.eater.com', label: 'Eater Austin', city: 'Austin' },
  { domain: 'texasmonthly.com', label: 'Texas Monthly', city: 'Austin' },

  // === Seattle / Portland ===
  { domain: 'seattletimes.com', label: 'Seattle Times', city: 'Seattle' },
  { domain: 'seattle.eater.com', label: 'Eater Seattle', city: 'Seattle' },
  { domain: 'oregonlive.com', label: 'The Oregonian', city: 'Portland' },
  { domain: 'pdx.eater.com', label: 'Eater Portland', city: 'Portland' },

  // === Atlanta / Denver / Philly / DC ===
  { domain: 'ajc.com', label: 'Atlanta Journal-Constitution', city: 'Atlanta' },
  { domain: 'atlanta.eater.com', label: 'Eater Atlanta', city: 'Atlanta' },
  { domain: 'denverpost.com', label: 'Denver Post', city: 'Denver' },
  { domain: 'denver.eater.com', label: 'Eater Denver', city: 'Denver' },
  { domain: 'inquirer.com', label: 'Philadelphia Inquirer', city: 'Philadelphia' },
  { domain: 'philly.eater.com', label: 'Eater Philly', city: 'Philadelphia' },
  { domain: 'washingtonian.com', label: 'Washingtonian', city: 'Washington DC' },
  { domain: 'dc.eater.com', label: 'Eater DC', city: 'Washington DC' },

  // === Health / wellness / consumer (national) ===
  { domain: 'everydayhealth.com', label: 'Everyday Health', city: 'New York' },
  { domain: 'healthline.com', label: 'Healthline', city: 'San Francisco' },
  { domain: 'verywellhealth.com', label: 'Verywell Health', city: 'New York' },
  { domain: 'medicalnewstoday.com', label: 'Medical News Today', city: 'National' },
  { domain: 'webmd.com', label: 'WebMD', city: 'New York' },
  { domain: 'consumerreports.org', label: 'Consumer Reports', city: 'Yonkers' },

  // === Trade / food industry / food safety ===
  { domain: 'foodsafetynews.com', label: 'Food Safety News', city: 'National' },
  { domain: 'foodnavigator-usa.com', label: 'FoodNavigator USA', city: 'National' },
  { domain: 'fooddive.com', label: 'Food Dive', city: 'National' },
  { domain: 'foodbusinessnews.net', label: 'Food Business News', city: 'Kansas City' },
  { domain: 'supermarketnews.com', label: 'Supermarket News', city: 'National' },
  { domain: 'nrn.com', label: "Nation's Restaurant News", city: 'National' },
  { domain: 'restaurantbusinessonline.com', label: 'Restaurant Business', city: 'National' },
  { domain: 'civileats.com', label: 'Civil Eats', city: 'National' },
  { domain: 'thecounter.org', label: 'The Counter', city: 'National' },
  { domain: 'modernfarmer.com', label: 'Modern Farmer', city: 'National' },
  { domain: 'progressivegrocer.com', label: 'Progressive Grocer', city: 'National' }
];

const JOURNALIST_TITLES = [
  'journalist', 'reporter', 'editor', 'correspondent',
  'anchor', 'producer', 'writer', 'columnist',
  'news director', 'editor-in-chief', 'staff writer',
  'contributor', 'critic', 'features editor', 'senior editor'
];

const POSITION_KEYWORDS = [
  'food', 'health', 'wellness', 'lifestyle', 'editor', 'reporter',
  'writer', 'journalist', 'correspondent', 'critic', 'producer',
  'contributor', 'staff', 'news', 'features', 'columnist', 'nutrition'
];

const PER_PAGE = 25;
const MAX_PAGES_PER_DOMAIN = 4; // 4 * 25 = 100 contacts max par média
const SLEEP_BETWEEN_CALLS_MS = 1500;
// Garde-fou : nombre max de révélations par session = crédits Apollo dépensés.
// Modifiez selon votre quota restant.
const MAX_REVEALS = 500;

const HUNTER_CSV = path.join(__dirname, 'output', 'media-contacts.csv');
const OUTPUT_CSV = path.join(__dirname, 'output', 'media-contacts-apollo.csv');
const SKIPPED_CSV = path.join(__dirname, 'output', 'apollo-skipped.csv');

// --- CSV helpers ---------------------------------------------------------

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parseCsv(content) {
  // Parser minimal qui gère les guillemets et virgules échappées.
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (inQuotes) {
      if (c === '"' && content[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else { field += c; }
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function loadHunterDedup(csvPath) {
  const emails = new Set();
  const nameDomains = new Set();
  if (!fs.existsSync(csvPath)) {
    log(`[!] ${csvPath} introuvable — aucune déduplication appliquée.`, 'yellow');
    return { emails, nameDomains };
  }
  const content = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCsv(content);
  if (rows.length === 0) return { emails, nameDomains };
  const header = rows[0].map((h) => h.toLowerCase().trim());
  const idx = (name) => header.indexOf(name);
  const iEmail = idx('email');
  const iFirst = idx('first_name');
  const iLast = idx('last_name');
  const iDomain = idx('domain');

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;
    const email = (iEmail >= 0 ? row[iEmail] : '') || '';
    const first = (iFirst >= 0 ? row[iFirst] : '') || '';
    const last = (iLast >= 0 ? row[iLast] : '') || '';
    let domain = (iDomain >= 0 ? row[iDomain] : '') || '';
    if (email) {
      emails.add(email.toLowerCase().trim());
      if (!domain && email.includes('@')) domain = email.split('@')[1];
    }
    if (first && last && domain) {
      const key = `${first.toLowerCase().trim()} ${last.toLowerCase().trim()}|${domain.toLowerCase().trim()}`;
      nameDomains.add(key);
    }
  }
  log(`Hunter chargé : ${emails.size} emails, ${nameDomains.size} couples nom+domaine`, 'gray');
  return { emails, nameDomains };
}

// --- Apollo API ----------------------------------------------------------

function apolloRequest(endpoint, body, apiKey) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'api.apollo.io',
      port: 443,
      path: endpoint,
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        if (res.statusCode === 429) {
          return resolve({ rateLimited: true, raw });
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 500)}`));
        }
        try { resolve(JSON.parse(raw)); }
        catch (err) { reject(err); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function searchPeople(domain, page, apiKey) {
  const body = {
    person_titles: JOURNALIST_TITLES,
    q_organization_domains: domain,
    person_locations: ['United States'],
    page,
    per_page: PER_PAGE
  };
  let res = await apolloRequest('/v1/mixed_people/search', body, apiKey);
  if (res.rateLimited) {
    log('  rate limit, pause 60s...', 'yellow');
    await sleep(60000);
    res = await apolloRequest('/v1/mixed_people/search', body, apiKey);
  }
  return res;
}

async function revealEmail(personId, apiKey) {
  const body = { id: personId, reveal_personal_emails: false };
  let res = await apolloRequest('/v1/people/match', body, apiKey);
  if (res.rateLimited) {
    log('  rate limit, pause 60s...', 'yellow');
    await sleep(60000);
    res = await apolloRequest('/v1/people/match', body, apiKey);
  }
  return res && res.person ? res.person : null;
}

function isEmailLocked(email) {
  if (!email) return true;
  return String(email).toLowerCase().includes('email_not_unlocked');
}

function isPositionRelevant(title) {
  if (!title) return true; // Apollo ne filtre pas toujours, on garde par défaut
  const t = title.toLowerCase();
  return POSITION_KEYWORDS.some((kw) => t.includes(kw));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Main ----------------------------------------------------------------

async function main() {
  loadEnv();
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    log('❌ APOLLO_API_KEY manquante (env ou .env)', 'red');
    process.exit(1);
  }

  const outDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const { emails: hunterEmails, nameDomains: hunterNameDomains } = loadHunterDedup(HUNTER_CSV);

  const newRows = [];
  const skippedRows = [];
  const seenApolloIds = new Set();
  let revealsUsed = 0;
  let totalSearched = 0;

  outer: for (const target of DOMAINS) {
    if (revealsUsed >= MAX_REVEALS) {
      log(`\n[!] Quota MAX_REVEALS atteint (${MAX_REVEALS}). Arrêt.`, 'yellow');
      break;
    }
    log(`\n→ ${target.label} (${target.domain})`, 'cyan');

    for (let page = 1; page <= MAX_PAGES_PER_DOMAIN; page++) {
      if (revealsUsed >= MAX_REVEALS) break outer;

      let data;
      try {
        data = await searchPeople(target.domain, page, apiKey);
      } catch (err) {
        log(`  ⚠ erreur search page ${page}: ${err.message}`, 'red');
        break;
      }

      const people = (data.people || []).concat(data.contacts || []);
      if (people.length === 0) {
        if (page === 1) log(`  aucun contact trouvé`, 'gray');
        break;
      }
      log(`  page ${page}: ${people.length} contacts`, 'gray');
      totalSearched += people.length;

      for (const p of people) {
        if (revealsUsed >= MAX_REVEALS) break outer;
        const pid = p.id;
        if (!pid || seenApolloIds.has(pid)) continue;
        seenApolloIds.add(pid);

        const title = p.title || '';
        if (!isPositionRelevant(title)) {
          skippedRows.push({
            reason: 'title not relevant',
            name: p.name || '',
            title,
            media: target.label,
            domain: target.domain,
            email: '',
            apollo_id: pid
          });
          continue;
        }

        const fullName = (p.name || '').toLowerCase().trim();
        const dedupKey = `${fullName}|${target.domain.toLowerCase()}`;

        // ---- FILTRE 1 : avant révélation, économise un crédit ----
        if (hunterNameDomains.has(dedupKey)) {
          skippedRows.push({
            reason: 'name+domain match Hunter (pre-reveal)',
            name: p.name || '',
            title,
            media: target.label,
            domain: target.domain,
            email: '',
            apollo_id: pid
          });
          continue;
        }

        // Email déjà visible côté search ? (rare)
        let email = p.email || '';
        if (!isEmailLocked(email)) {
          if (email && hunterEmails.has(email.toLowerCase())) {
            skippedRows.push({
              reason: 'email already in Hunter (pre-reveal)',
              name: p.name || '',
              title,
              media: target.label,
              domain: target.domain,
              email,
              apollo_id: pid
            });
            continue;
          }
        } else {
          // ---- RÉVÉLATION : 1 crédit Apollo ----
          let enriched;
          try {
            enriched = await revealEmail(pid, apiKey);
          } catch (err) {
            log(`  ⚠ reveal error pour ${p.name}: ${err.message}`, 'red');
            await sleep(SLEEP_BETWEEN_CALLS_MS);
            continue;
          }
          revealsUsed++;
          await sleep(SLEEP_BETWEEN_CALLS_MS);
          if (!enriched) continue;
          email = enriched.email || '';
          if (isEmailLocked(email)) {
            skippedRows.push({
              reason: 'no verified email after reveal',
              name: p.name || '',
              title,
              media: target.label,
              domain: target.domain,
              email: '',
              apollo_id: pid
            });
            continue;
          }
          // merge enriched
          Object.assign(p, enriched);
        }

        // ---- FILTRE 2 : après révélation, double check ----
        if (email && hunterEmails.has(email.toLowerCase())) {
          skippedRows.push({
            reason: 'email already in Hunter (post-reveal)',
            name: p.name || '',
            title,
            media: target.label,
            domain: target.domain,
            email,
            apollo_id: pid
          });
          continue;
        }

        const org = p.organization || {};
        newRows.push({
          media: org.name || target.label,
          city: target.city,
          domain: target.domain,
          first_name: p.first_name || '',
          last_name: p.last_name || '',
          email,
          position: p.title || '',
          seniority: p.seniority || '',
          linkedin: p.linkedin_url || '',
          twitter: p.twitter_url || '',
          state: p.state || '',
          country: p.country || '',
          apollo_id: pid
        });
        // Mettre à jour le set pour éviter doublons intra-session
        hunterEmails.add(email.toLowerCase());
      }

      await sleep(SLEEP_BETWEEN_CALLS_MS);

      const pagination = data.pagination || {};
      if (page >= (pagination.total_pages || 0)) break;
    }
  }

  // --- Export CSV ---
  const newHeader = [
    'media', 'city', 'domain', 'first_name', 'last_name', 'email',
    'position', 'seniority', 'linkedin', 'twitter', 'state', 'country', 'apollo_id'
  ];
  const newCsv = [newHeader.join(',')]
    .concat(newRows.map((r) => newHeader.map((h) => csvEscape(r[h])).join(',')))
    .join('\n');
  fs.writeFileSync(OUTPUT_CSV, newCsv, 'utf8');

  const skippedHeader = ['reason', 'name', 'title', 'media', 'domain', 'email', 'apollo_id'];
  const skippedCsv = [skippedHeader.join(',')]
    .concat(skippedRows.map((r) => skippedHeader.map((h) => csvEscape(r[h])).join(',')))
    .join('\n');
  fs.writeFileSync(SKIPPED_CSV, skippedCsv, 'utf8');

  log(`\n--- Bilan ---`, 'cyan');
  log(`Crédits Apollo consommés (révélations) : ${revealsUsed}`, 'yellow');
  log(`Contacts examinés                       : ${totalSearched}`, 'gray');
  log(`Nouveaux contacts retenus               : ${newRows.length}`, 'green');
  log(`Doublons / non pertinents exclus        : ${skippedRows.length}`, 'gray');
  log(`\nCSV nouveau   : ${OUTPUT_CSV}`, 'cyan');
  log(`CSV skipped   : ${SKIPPED_CSV}`, 'cyan');
}

main().catch((err) => {
  log(`\n❌ ${err.message}`, 'red');
  process.exit(1);
});
