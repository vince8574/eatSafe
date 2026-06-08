import * as functions from 'firebase-functions/v1';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import * as https from 'https';
import { Resend } from 'resend';
admin.initializeApp();

export { ocrClaude } from './ocrClaude';
export { ocrVision } from './ocrVision';

const firestore = admin.firestore();

// Resend API key stored as Firebase secret:
//   firebase functions:secrets:set RESEND_API_KEY
const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

const FROM_ADDRESS = 'Numeline <invitations@send.numeline.com>';
const REPLY_TO = 'support@numeline.com';
const APP_NAME = 'Numeline';

function buildInvitationHtml(orgName: string, role: string, inviterName: string, invitedEmail: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6f8;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
          <tr>
            <td align="center" style="background-color:#0A1F1F;padding:32px 24px;">
              <img src="https://numeline.com/logo.png" alt="${APP_NAME}" width="80" height="80" style="display:block;border:0;border-radius:50%;" />
              <div style="color:#35F2A9;font-size:24px;font-weight:700;margin-top:16px;">${APP_NAME}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:0;font-size:0;line-height:0;">
              <img src="https://numeline.com/feature-graphic-1024x500.png" alt="${APP_NAME}" width="560" style="display:block;border:0;width:100%;max-width:560px;height:auto;" />
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 16px 32px;color:#0A1F1F;">
              <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600;">You're invited!</h1>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#374151;">
                Hello,
              </p>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#374151;">
                ${inviterName ? `<strong>${inviterName}</strong> has invited you` : 'You have been invited'} to join
                <strong>${orgName}</strong> on ${APP_NAME} as <strong>${role}</strong>.
              </p>
              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#374151;">
                ${APP_NAME} helps food professionals scan products and get instant alerts on FDA and USDA recalls.
              </p>
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td align="center" style="background-color:#35F2A9;border-radius:12px;">
                    <a href="https://numeline.com/download" style="display:inline-block;padding:14px 28px;color:#0A1F1F;font-size:15px;font-weight:600;text-decoration:none;">
                      Download ${APP_NAME}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0 0;font-size:13px;line-height:1.5;color:#6b7280;text-align:center;">
                Once installed, sign in with <strong>${invitedEmail}</strong> and your invitation will appear automatically.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;line-height:1.5;">
              <p style="margin:0;">
                You received this email because someone invited you to ${APP_NAME}.
                If this was a mistake, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0 0;font-size:12px;color:#9ca3af;">
          © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildInvitationText(orgName: string, role: string, inviterName: string, invitedEmail: string): string {
  return `You're invited to join ${orgName} on ${APP_NAME}!

${inviterName ? `${inviterName} has invited you` : 'You have been invited'} to join ${orgName} on ${APP_NAME} as ${role}.

${APP_NAME} helps food professionals scan products and get instant alerts on FDA and USDA recalls.

Download ${APP_NAME}: https://numeline.com/download

Once installed, sign in with ${invitedEmail} and your invitation will appear automatically.

—
You received this email because someone invited you to ${APP_NAME}.
If this was a mistake, you can safely ignore this email.`;
}

/**
 * Triggered when a new invite document is created in Firestore.
 * Sends an invitation email via Resend.
 */
export const sendInvitationEmail = functions
  .region('europe-west1')
  .runWith({ secrets: [RESEND_API_KEY] })
  .firestore.document('organizationInvites/{inviteId}')
  .onCreate(async (snapshot: FirebaseFirestore.QueryDocumentSnapshot) => {
    const resendApiKey = process.env.RESEND_API_KEY ?? '';
    if (!resendApiKey) {
      console.error('[sendInvitationEmail] RESEND_API_KEY secret not set. Run: firebase functions:secrets:set RESEND_API_KEY');
      return null;
    }
    const resend = new Resend(resendApiKey);

    const invite = snapshot.data();
    if (!invite) {
      console.warn('[sendInvitationEmail] Invite document is empty');
      return null;
    }

    const targetEmail: string = invite.email;
    const orgName: string = invite.orgName ?? 'an organization';
    const role: string = invite.role ?? 'member';
    const invitedBy: string = invite.invitedBy ?? '';

    if (!targetEmail) {
      console.warn('[sendInvitationEmail] No target email on invite');
      return null;
    }

    // Try to fetch inviter's display name for a more personal email
    let inviterName = '';
    if (invitedBy) {
      try {
        const inviterRecord = await admin.auth().getUser(invitedBy);
        inviterName = inviterRecord.displayName || inviterRecord.email || '';
      } catch (err) {
        console.warn(`[sendInvitationEmail] Could not fetch inviter ${invitedBy}:`, err);
      }
    }

    try {
      const response = await resend.emails.send({
        from: FROM_ADDRESS,
        to: targetEmail,
        replyTo: REPLY_TO,
        subject: `Invitation to join ${orgName} on ${APP_NAME}`,
        html: buildInvitationHtml(orgName, role, inviterName, targetEmail),
        text: buildInvitationText(orgName, role, inviterName, targetEmail),
      });

      console.log(`[sendInvitationEmail] Sent invite to ${targetEmail}, message id: ${response.data?.id ?? 'unknown'}`);

      // Store delivery status on the invite document
      await snapshot.ref.update({
        emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
        emailMessageId: response.data?.id ?? null,
      });

      return { success: true };
    } catch (error) {
      console.error('[sendInvitationEmail] Failed to send invitation email:', error);
      await snapshot.ref.update({
        emailError: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });

// Helper function to fetch recalls from Rappel Conso API
function fetchRappelConsoRecalls(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'data.economie.gouv.fr',
      path: '/api/records/1.0/search/?dataset=rappelconso0&rows=100&sort=-date_de_publication',
      method: 'GET',
      headers: { 'User-Agent': 'EatsOK/1.0' }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const recalls = (json.records || []).map((record: any) => ({
            id: record.recordid,
            title: record.fields?.noms_des_modeles_ou_references || record.fields?.libelle || 'Produit rappelé',
            description: record.fields?.motif_du_rappel,
            brand: record.fields?.nom_de_la_marque_du_produit,
            lotNumbers: extractLotNumbers(record.fields?.identification_des_produits),
            publishedAt: record.fields?.date_de_publication,
            link: record.fields?.lien_vers_la_fiche_rappel
          }));
          resolve(recalls);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

// Helper function to extract lot numbers
function extractLotNumbers(identificationText: string | undefined): string[] {
  if (!identificationText) return [];
  const parts = identificationText.split(/[\n,;]/);
  const lotNumbers: string[] = [identificationText];
  parts.forEach(part => {
    const trimmed = part.trim();
    if (trimmed.length > 0) {
      lotNumbers.push(trimmed);
    }
  });
  return lotNumbers;
}

// Helper function to check if a product matches a recall
function matchesRecall(product: any, recall: any): boolean {
  // Normalize brand names
  const productBrand = product.brand?.toLowerCase().trim() || '';
  const recallBrand = recall.brand?.toLowerCase().trim() || '';

  // Check brand match (fuzzy matching)
  if (productBrand && recallBrand && !productBrand.includes(recallBrand) && !recallBrand.includes(productBrand)) {
    return false;
  }

  // Check lot number match
  if (product.lotNumber && recall.lotNumbers) {
    const productLot = product.lotNumber.toLowerCase().trim();
    return recall.lotNumbers.some((recallLot: string) => {
      const normalizedRecallLot = recallLot.toLowerCase().trim();
      return productLot.includes(normalizedRecallLot) || normalizedRecallLot.includes(productLot);
    });
  }

  return false;
}

export const purgeOldScans = functions
  .region('europe-west1')
  .pubsub.schedule('every 24 hours')
  .timeZone('Europe/Paris')
  .onRun(async () => {
    const snapshot = await firestore.collection('scans').get();

    const batch = firestore.batch();
    let deleted = 0;

    snapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = doc.data();
      const scannedAt = data.scannedAt ? new Date(data.scannedAt) : null;

      if (scannedAt && monthsBetween(scannedAt, new Date()) >= 6) {
        batch.delete(doc.ref);
        deleted += 1;
      }
    });

    if (deleted > 0) {
      await batch.commit();
    }

    return { deleted };
  });

function monthsBetween(start: Date, end: Date) {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

export const notifyRecallMatch = functions
  .region('europe-west1')
  .https.onCall(async ({ productId, recall }: { productId: string; recall: { id: string; title: string } }) => {
    const productRef = firestore.collection('scans').doc(productId);
    const productSnap = await productRef.get();

    if (!productSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Produit introuvable');
    }

    await productRef.update({
      recallStatus: 'recalled',
      recallReference: recall.id,
      lastCheckedAt: Date.now()
    });

    const messaging = admin.messaging();
    await messaging.send({
      topic: `recall-${recall.id}`,
      notification: {
        title: 'Rappel produit détecté',
        body: `${recall.title} fait l'objet d'un rappel.`
      },
      data: {
        productId,
        recallId: recall.id
      }
    });

    return { success: true };
  });

// New function: Check recalls every hour and send notifications
export const checkRecallsHourly = functions
  .region('europe-west1')
  .pubsub.schedule('every 1 hours')
  .timeZone('Europe/Paris')
  .onRun(async () => {
    console.log('Starting hourly recall check...');

    try {
      // Fetch latest recalls from API
      const recalls = await fetchRappelConsoRecalls();
      console.log(`Fetched ${recalls.length} recalls from API`);

      // Get all scanned products from Firestore
      const scansSnapshot = await firestore.collection('scans').get();
      console.log(`Found ${scansSnapshot.size} scanned products in database`);

      let notificationsSent = 0;
      let productsUpdated = 0;
      const messaging = admin.messaging();

      // Check each product against recalls
      for (const scanDoc of scansSnapshot.docs) {
        const product = scanDoc.data();

        // Skip if already marked as recalled
        if (product.recallStatus === 'recalled') {
          continue;
        }

        // Check if product matches any recall
        for (const recall of recalls) {
          if (matchesRecall(product, recall)) {
            console.log(`Match found: ${product.brand} - ${product.lotNumber} matches recall ${recall.id}`);

            // Update product in Firestore
            await scanDoc.ref.update({
              recallStatus: 'recalled',
              recallReference: recall.id,
              lastCheckedAt: Date.now()
            });
            productsUpdated++;

            // Send push notification if user has FCM token
            if (product.fcmToken) {
              try {
                await messaging.send({
                  token: product.fcmToken,
                  notification: {
                    title: '⚠️ Rappel produit détecté',
                    body: `${recall.title} fait l'objet d'un rappel sanitaire.`
                  },
                  data: {
                    type: 'recall',
                    productId: scanDoc.id,
                    recallId: recall.id,
                    brand: product.brand || '',
                    lotNumber: product.lotNumber || ''
                  },
                  android: {
                    priority: 'high',
                    notification: {
                      channelId: 'recall-alerts',
                      priority: 'high',
                      sound: 'default'
                    }
                  }
                });
                notificationsSent++;
                console.log(`Notification sent for product ${scanDoc.id}`);
              } catch (notifError) {
                console.error(`Failed to send notification for ${scanDoc.id}:`, notifError);
              }
            }

            break; // Only match first recall
          }
        }
      }

      console.log(`Hourly check complete: ${productsUpdated} products updated, ${notificationsSent} notifications sent`);

      return {
        success: true,
        recallsChecked: recalls.length,
        productsScanned: scansSnapshot.size,
        productsUpdated,
        notificationsSent
      };
    } catch (error) {
      console.error('Error in hourly recall check:', error);
      return {
        success: false,
        error: String(error)
      };
    }
  });
