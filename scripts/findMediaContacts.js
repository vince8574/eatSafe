#!/usr/bin/env node
/**
 * Récupère les emails de médias food/santé via Hunter.io Domain Search.
 *
 * Usage:
 *   HUNTER_API_KEY=xxx node scripts/findMediaContacts.js
 *   ou ajouter HUNTER_API_KEY=xxx dans le fichier .env
 *
 * Sortie: scripts/output/media-contacts.csv
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

const POSITION_KEYWORDS = [
  'food', 'health', 'wellness', 'lifestyle', 'editor', 'reporter',
  'writer', 'journalist', 'correspondent', 'critic', 'producer',
  'contributor', 'staff', 'news', 'features', 'columnist'
];

const MIN_CONFIDENCE = 50;

function fetchDomain(domain, apiKey) {
  return new Promise((resolve, reject) => {
    const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${apiKey}&limit=10`;
    https
      .get(url, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            return reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(err);
          }
        });
      })
      .on('error', reject);
  });
}

function isRelevant(email) {
  const haystack = [email.position, email.department, email.seniority]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (!haystack) return false;
  return POSITION_KEYWORDS.some((kw) => haystack.includes(kw));
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  loadEnv();
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) {
    log('❌ HUNTER_API_KEY manquante (env ou .env)', 'red');
    process.exit(1);
  }

  const outDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'media-contacts.csv');

  const rows = [];
  let totalEmails = 0;
  let totalRelevant = 0;

  for (const target of DOMAINS) {
    log(`\n→ ${target.label} (${target.domain})`, 'cyan');
    try {
      const result = await fetchDomain(target.domain, apiKey);
      const data = result.data || {};
      const emails = data.emails || [];
      const orgName = data.organization || target.label;

      log(`  ${emails.length} emails trouvés`, 'gray');
      totalEmails += emails.length;

      const relevant = emails.filter(
        (e) => isRelevant(e) && (e.confidence || 0) >= MIN_CONFIDENCE
      );
      log(`  ${relevant.length} pertinents (poste + confidence ≥ ${MIN_CONFIDENCE})`, 'green');
      totalRelevant += relevant.length;

      for (const e of relevant) {
        rows.push({
          media: orgName,
          city: target.city,
          domain: target.domain,
          first_name: e.first_name || '',
          last_name: e.last_name || '',
          email: e.value,
          position: e.position || '',
          department: e.department || '',
          seniority: e.seniority || '',
          confidence: e.confidence || 0,
          linkedin: e.linkedin || '',
          twitter: e.twitter || '',
          verification_status: (e.verification && e.verification.status) || ''
        });
      }
    } catch (err) {
      log(`  ⚠ erreur: ${err.message}`, 'red');
    }

    // Hunter.io rate limit: 25 req/s — on reste très en dessous
    await sleep(300);
  }

  rows.sort((a, b) => b.confidence - a.confidence);

  const header = [
    'media', 'city', 'domain', 'first_name', 'last_name', 'email',
    'position', 'department', 'seniority', 'confidence', 'linkedin',
    'twitter', 'verification_status'
  ];
  const csv = [header.join(',')]
    .concat(rows.map((r) => header.map((h) => csvEscape(r[h])).join(',')))
    .join('\n');

  fs.writeFileSync(outPath, csv, 'utf8');

  log(`\n✓ ${rows.length} contacts exportés`, 'green');
  log(`  Total emails scannés: ${totalEmails}`, 'gray');
  log(`  Total pertinents: ${totalRelevant}`, 'gray');
  log(`  CSV: ${outPath}`, 'cyan');
}

main().catch((err) => {
  log(`\n❌ ${err.message}`, 'red');
  process.exit(1);
});
