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


// SUPPRIMÉ : checkRecallsHourly / notifyRecallMatch / purgeOldScans + helpers
// (fetchRappelConsoRecalls, matchesRecall). Ces fonctions étaient héritées de
// NumelineFR et JAMAIS adaptées : elles interrogeaient RappelConso (API
// FRANÇAISE) pour matcher les scans, avec un matching laxiste (marque vide =
// passe-droit, sous-chaîne bidirectionnelle sans longueur min) → fausses
// alertes. Surtout, elles portaient les MÊMES NOMS dans la MÊME RÉGION
// (europe-west1) que les fonctions du codebase FR sur ce projet Firebase
// partagé → chaque déploiement d'une app écrasait les fonctions de l'autre.
// Les versions FR (codebase "default") restent les seules propriétaires.
// L'app US fait sa vérification de rappels côté client (recallCheckService +
// lotMatcher durci) sur les bases FDA/USDA.
