import * as admin from 'firebase-admin';
import type { Request, Response } from 'firebase-functions/v1';

/**
 * Verifies a Firebase App Check token attached to an HTTP request.
 *
 * Mode is controlled by the APP_CHECK_ENFORCE environment variable:
 *   - 'true'  → reject with 401 if the token is missing or invalid
 *   - other   → monitor-only: log the issue and let the request through
 *
 * Returns true when the caller should be allowed to proceed, false when
 * the response has been finalized with a 401 (enforce mode only).
 */
export async function checkAppCheck(req: Request, res: Response): Promise<boolean> {
  const enforce = process.env.APP_CHECK_ENFORCE === 'true';
  const token = req.header('X-Firebase-AppCheck');

  if (!token) {
    if (enforce) {
      res.status(401).json({ error: 'App Check token required' });
      return false;
    }
    console.warn('[AppCheck] MONITOR: missing token');
    return true;
  }

  try {
    await admin.appCheck().verifyToken(token);
    return true;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown';
    if (enforce) {
      res.status(401).json({ error: 'Invalid App Check token' });
      return false;
    }
    console.warn('[AppCheck] MONITOR: invalid token —', message);
    return true;
  }
}
