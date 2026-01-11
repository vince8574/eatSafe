#!/usr/bin/env node
/**
 * Script de test pour vérifier que les API keys sont correctement configurées
 * Usage: node scripts/test-api-keys.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Lire le fichier .env
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');

  if (!fs.existsSync(envPath)) {
    log('❌ Fichier .env introuvable', 'red');
    log('   Créez-le avec: cp .env.example .env', 'yellow');
    return null;
  }

  log('✅ Fichier .env trouvé', 'green');

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const env = {};

  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  });

  return env;
}

// Tester la clé Google Vision API
function testVisionAPI(apiKey) {
  return new Promise((resolve, reject) => {
    log('\n🔍 Test de la Google Vision API...', 'cyan');

    if (!apiKey || apiKey === 'your_google_vision_api_key_here') {
      log('❌ Clé API non configurée dans .env', 'red');
      log('   Éditez le fichier .env et ajoutez votre vraie clé', 'yellow');
      resolve(false);
      return;
    }

    // Image de test (1x1 pixel transparent en base64)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const requestBody = JSON.stringify({
      requests: [{
        image: { content: testImageBase64 },
        features: [{ type: 'TEXT_DETECTION' }]
      }]
    });

    const options = {
      hostname: 'vision.googleapis.com',
      path: `/v1/images:annotate?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);

          if (res.statusCode === 200 && response.responses) {
            log('✅ Google Vision API fonctionne correctement!', 'green');
            log(`   Status: ${res.statusCode}`, 'cyan');
            resolve(true);
          } else if (response.error) {
            log('❌ Erreur API:', 'red');
            log(`   ${response.error.message}`, 'yellow');
            if (response.error.code === 403) {
              log('   → Vérifiez que l\'API Vision est activée dans Google Cloud Console', 'yellow');
              log('   → Vérifiez les restrictions de votre clé API', 'yellow');
            }
            resolve(false);
          } else {
            log('❌ Réponse inattendue de l\'API', 'red');
            log(`   Status: ${res.statusCode}`, 'yellow');
            resolve(false);
          }
        } catch (error) {
          log('❌ Erreur lors du parsing de la réponse', 'red');
          log(`   ${error.message}`, 'yellow');
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      log('❌ Erreur de connexion à l\'API', 'red');
      log(`   ${error.message}`, 'yellow');
      resolve(false);
    });

    req.write(requestBody);
    req.end();
  });
}

// Vérifier que .env est dans .gitignore
function checkGitignore() {
  const gitignorePath = path.join(__dirname, '..', '.gitignore');

  if (!fs.existsSync(gitignorePath)) {
    log('⚠️  Fichier .gitignore introuvable', 'yellow');
    return false;
  }

  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
  const hasEnvIgnore = gitignoreContent.includes('.env') || gitignoreContent.includes('*.env');

  if (hasEnvIgnore) {
    log('✅ .env est bien dans .gitignore', 'green');
    return true;
  } else {
    log('❌ .env n\'est PAS dans .gitignore', 'red');
    log('   Ajoutez ".env" à votre .gitignore pour éviter de commiter vos clés!', 'yellow');
    return false;
  }
}

// Main
async function main() {
  log('🔐 Vérification de la configuration des API Keys\n', 'cyan');

  // 1. Vérifier .gitignore
  checkGitignore();

  // 2. Charger .env
  const env = loadEnv();
  if (!env) {
    process.exit(1);
  }

  // 3. Afficher les variables trouvées (sans exposer la clé complète)
  log('\n📋 Variables d\'environnement trouvées:', 'cyan');
  const apiKey = env.EXPO_PUBLIC_VISION_API_KEY;
  const endpoint = env.EXPO_PUBLIC_VISION_ENDPOINT;

  if (apiKey) {
    const masked = apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4);
    log(`   EXPO_PUBLIC_VISION_API_KEY = ${masked}`, 'green');
  } else {
    log('   EXPO_PUBLIC_VISION_API_KEY = non définie', 'red');
  }

  if (endpoint) {
    log(`   EXPO_PUBLIC_VISION_ENDPOINT = ${endpoint}`, 'green');
  } else {
    log('   EXPO_PUBLIC_VISION_ENDPOINT = non définie', 'red');
  }

  // 4. Tester l'API
  if (apiKey) {
    const apiWorks = await testVisionAPI(apiKey);

    log('\n' + '='.repeat(60), 'cyan');
    if (apiWorks) {
      log('✅ Configuration complète et fonctionnelle!', 'green');
      log('\nVous pouvez lancer votre app avec: npm start', 'cyan');
    } else {
      log('⚠️  Configuration incomplète ou clé invalide', 'yellow');
      log('\nVérifiez votre clé API dans le fichier .env', 'yellow');
    }
    log('='.repeat(60), 'cyan');
  }
}

main().catch(error => {
  log(`\n❌ Erreur: ${error.message}`, 'red');
  process.exit(1);
});
