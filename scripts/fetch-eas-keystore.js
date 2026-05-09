/**
 * One-off helper: fetches the EAS-managed Android upload keystore for this
 * project and writes it locally so we can sign AABs from CI (GitHub Actions)
 * with the same key Google Play knows about.
 *
 * Usage: node scripts/fetch-eas-keystore.js
 *
 * Outputs (in scripts/output/):
 *   - release.keystore       (binary .jks)
 *   - keystore-info.json     (passwords, alias, fingerprints — DO NOT COMMIT)
 *   - keystore.base64.txt    (base64 of the .jks for the GH secret)
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const STATE_PATH = path.join(os.homedir(), '.expo', 'state.json');
const APP_JSON_PATH = path.join(__dirname, '..', 'app.json');
const OUT_DIR = path.join(__dirname, 'output');

function readSessionSecret() {
  const raw = fs.readFileSync(STATE_PATH, 'utf8');
  const state = JSON.parse(raw);
  if (!state?.auth?.sessionSecret) {
    throw new Error('No EAS session in ~/.expo/state.json — run `eas login` first');
  }
  return { sessionSecret: state.auth.sessionSecret, username: state.auth.username };
}

function readAppConfig() {
  const raw = fs.readFileSync(APP_JSON_PATH, 'utf8');
  const cfg = JSON.parse(raw);
  const slug = cfg?.expo?.slug;
  const androidPackage = cfg?.expo?.android?.package;
  if (!slug || !androidPackage) {
    throw new Error('app.json missing expo.slug or expo.android.package');
  }
  return { slug, androidPackage };
}

const QUERY = `
query CommonAndroidAppCredentialsWithBuildCredentialsByApplicationIdentifierQuery(
  $projectFullName: String!
  $applicationIdentifier: String
) {
  app {
    byFullName(fullName: $projectFullName) {
      id
      androidAppCredentials(filter: { applicationIdentifier: $applicationIdentifier }) {
        id
        applicationIdentifier
        androidAppBuildCredentialsList {
          id
          isDefault
          name
          androidKeystore {
            id
            type
            keystore
            keystorePassword
            keyAlias
            keyPassword
            md5CertificateFingerprint
            sha1CertificateFingerprint
            sha256CertificateFingerprint
          }
        }
      }
    }
  }
}
`;

async function main() {
  const { sessionSecret, username } = readSessionSecret();
  const { slug, androidPackage } = readAppConfig();
  const projectFullName = `@${username}/${slug}`;
  console.log(`Fetching keystore for ${projectFullName} (package: ${androidPackage})`);

  const res = await fetch('https://api.expo.dev/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'expo-session': sessionSecret,
    },
    body: JSON.stringify({
      query: QUERY,
      variables: {
        projectFullName,
        applicationIdentifier: androidPackage,
      },
    }),
  });

  const json = await res.json();
  if (json.errors) {
    console.error('GraphQL errors:', JSON.stringify(json.errors, null, 2));
    process.exit(1);
  }

  const credsList = json.data?.app?.byFullName?.androidAppCredentials ?? [];
  if (credsList.length === 0) {
    console.error('No Android credentials found for', projectFullName);
    process.exit(1);
  }

  const buildCredsList = credsList[0].androidAppBuildCredentialsList ?? [];
  if (buildCredsList.length === 0) {
    console.error('No Android build credentials found');
    process.exit(1);
  }

  const buildCreds = buildCredsList.find((b) => b.isDefault) ?? buildCredsList[0];
  const ks = buildCreds.androidKeystore;
  if (!ks?.keystore) {
    console.error('No keystore on build credentials:', buildCreds.id);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const ksPath = path.join(OUT_DIR, 'release.keystore');
  const ksB64Path = path.join(OUT_DIR, 'keystore.base64.txt');
  const infoPath = path.join(OUT_DIR, 'keystore-info.json');

  fs.writeFileSync(ksPath, Buffer.from(ks.keystore, 'base64'));
  fs.writeFileSync(ksB64Path, ks.keystore);
  fs.writeFileSync(
    infoPath,
    JSON.stringify(
      {
        type: ks.type,
        keystorePassword: ks.keystorePassword,
        keyAlias: ks.keyAlias,
        keyPassword: ks.keyPassword,
        md5: ks.md5CertificateFingerprint,
        sha1: ks.sha1CertificateFingerprint,
        sha256: ks.sha256CertificateFingerprint,
      },
      null,
      2
    )
  );

  console.log('\nKeystore written:');
  console.log('  ', ksPath);
  console.log('  ', ksB64Path, '(for GH secret RELEASE_KEYSTORE_BASE64)');
  console.log('  ', infoPath, '(passwords + fingerprints — DO NOT COMMIT)');
  console.log('\nFingerprint comparison:');
  console.log('   SHA1 from EAS:        ', ks.sha1CertificateFingerprint);
  console.log('   Expected by Google Play: 66:04:32:81:2F:10:0F:D3:87:22:A3:46:6E:D4:F2:F8:E0:16:8A:B6');
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
