# Claude OCR — Deployment Guide

The `ocrClaude` Cloud Function adds a third-tier OCR fallback to the lot-scan
flow. It is invoked only when ML Kit (on-device) and Google Vision API (cloud)
have both failed to produce an extractable lot number — typically ~3% of scans
in production.

## One-time setup

### 1. Anthropic key + spending cap

1. Create a key at https://console.anthropic.com/settings/keys.
2. **Cap the monthly spend** at the same page → *Settings → Limits → Monthly
   spend limit*. Suggested: **20 USD/month** (~6,600 Claude calls, well above
   the expected 30-300 calls/month at typical scan volume).
3. Optionally enable auto-reload (min 5 USD, reload by 10 USD) as a soft
   throttling layer.

### 2. GitHub Actions secrets

Settings → Secrets and variables → Actions → New repository secret:

| Secret                     | Source                                                                                       |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`        | The `sk-ant-...` key from step 1.                                                            |
| `FIREBASE_PROJECT_ID`      | Your Firebase project ID (e.g. `numeline-prod`).                                             |
| `FIREBASE_SERVICE_ACCOUNT` | JSON contents of a service account key with the roles below.                                 |

Service account roles required (set in IAM on Google Cloud Console):
- **Cloud Functions Admin** — deploy the function
- **Secret Manager Admin** — create/update `ANTHROPIC_API_KEY`
- **Service Account User** — let the function run as the default runtime SA
- **Firebase Admin** *(or App Check Admin)* — required when App Check is enforced

Generate the key file at IAM & Admin → Service accounts → *Keys* → *Add key (JSON)*.
Paste the entire JSON content as the GitHub secret value.

### 3. Push the Anthropic key into Google Secret Manager

The Cloud Function reads `ANTHROPIC_API_KEY` from Google Secret Manager at
runtime via `defineSecret(...)`. The GitHub secret only exists to seed it.

Trigger the deploy workflow once with the sync flag enabled:

1. GitHub → **Actions** → **Deploy Firebase Functions** → *Run workflow*
2. Set `sync_anthropic_secret` to **true** → *Run workflow*

The workflow creates the `ANTHROPIC_API_KEY` secret (or adds a new version if
it already exists) and then deploys `ocrClaude`. On every subsequent deploy,
leave `sync_anthropic_secret` at **false** unless you are rotating the key.

### 4. Wire the function URL into the mobile app

After the first successful deploy, the workflow log prints something like:

```
✔  functions[us-central1-ocrClaude]: Successful create operation.
Function URL (ocrClaude): https://us-central1-<project>.cloudfunctions.net/ocrClaude
```

Copy that URL into either:
- the `EXPO_PUBLIC_CLAUDE_ENDPOINT` env var (see `.env.example`), or
- the `extra.claude.endpoint` field in `app.json` if you prefer baking it into
  the build.

Then run a fresh EAS build (`@react-native-firebase/app-check` is a native
module — the JS-only `EXPO_PUBLIC_CLAUDE_ENDPOINT` change does not require a
rebuild, but you will need one for App Check anyway if it has not landed yet).

### 5. Register App Check providers on Firebase Console

This is a manual step — it cannot be automated from the repo.

Firebase Console → *Build → App Check → Apps*:
- **Android app** (`com.eatsafe.app`) → register *Play Integrity*
- **iOS app** (`com.numeline.app`) → register *App Attest* with the *DeviceCheck*
  fallback

Until both are registered, App Check tokens issued by the client will be
rejected by Firebase. The Cloud Function defaults to **monitor mode** so
requests still succeed during this transition — see step 7.

### 6. (Dev only) Allow-list a debug App Check token

For local development with the debug provider, generate a debug token at first
launch (the React Native Firebase SDK prints it to the device log on the first
`getToken()` call when `provider: 'debug'` is set) and add it to:

Firebase Console → *App Check → Apps → Manage debug tokens* → *Add debug token*.

### 7. Flip App Check into enforce mode

Recommended timeline: deploy in monitor mode, watch the function logs for
~1-2 weeks for `[AppCheck] MONITOR` warnings. Once the rate of unauthenticated
requests drops near zero (only stragglers running old app versions remain),
flip the function to enforce mode by setting the env var on the Cloud Function:

```bash
firebase functions:config:set appcheck.enforce=true --project <PROJECT_ID>
# Or via the Google Cloud Console: Cloud Functions → ocrClaude → Edit →
# Runtime, build, connections and security settings → Runtime environment
# variables → APP_CHECK_ENFORCE=true → Deploy
```

The `checkAppCheck` helper reads `process.env.APP_CHECK_ENFORCE` and returns
401 on missing/invalid tokens once that variable is `'true'`.

## Routine deploys

Code-only changes to `ocrClaude` (or `appCheck.ts`):

1. Merge to `main`.
2. GitHub → **Actions** → **Deploy Firebase Functions** → *Run workflow*.
3. Leave `sync_anthropic_secret` at **false**.
4. *Run workflow*.

The Anthropic key in Google Secret Manager is untouched.

## Rotating the Anthropic key

1. Generate a new key on the Anthropic console.
2. Update the `ANTHROPIC_API_KEY` GitHub secret with the new value.
3. Run the deploy workflow with `sync_anthropic_secret` set to **true**.
4. Revoke the previous key on the Anthropic console once the new deploy is
   confirmed working.

## Cost model

Per-call cost on Claude Sonnet 4.6 with image input + cache hit on the
system prompt: **~0.003 to 0.008 USD**. The cascade gates push ~97% of scans
to ML Kit and another ~2-3% to Vision, so Claude sees roughly 1-3% of total
scan volume.

Example: 10,000 scans/month → ~30-300 Claude calls → **~0.10 to 2.40 USD/month**.

The 20 USD/month spend cap is a hard ceiling that fires before any code-side
quota would notice. Combined with the App Check enforce + size cap on the
function payload, the surface for runaway cost is essentially zero.
