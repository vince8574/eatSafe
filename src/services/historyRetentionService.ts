import { ScannedProduct } from '../types';
import { db } from './dbService';
import { Subscription } from './subscriptionService';

/**
 * Supprime les produits qui ont dépassé la période de rétention
 * selon le plan d'abonnement de l'utilisateur
 */
export async function cleanOldScans(subscription: Subscription | null): Promise<number> {
  if (!subscription || subscription.historyRetentionDays === 'unlimited') {
    console.log('[historyRetention] Retention is unlimited, no cleanup needed');
    return 0;
  }

  const retentionDays = subscription.historyRetentionDays;
  if (retentionDays === 0) {
    console.log('[historyRetention] No retention configured, no cleanup needed');
    return 0;
  }

  const now = Date.now();
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
  const cutoffDate = now - retentionMs;

  console.log(`[historyRetention] Cleaning scans older than ${retentionDays} days (cutoff: ${new Date(cutoffDate).toISOString()})`);

  // Récupérer tous les produits
  const allProducts = await db.getAll();

  // Filtrer ceux qui sont trop anciens
  const productsToDelete = allProducts.filter(
    (product) => product.scannedAt < cutoffDate
  );

  // Supprimer les produits obsolètes
  for (const product of productsToDelete) {
    await db.remove(product.id);
    console.log(`[historyRetention] Deleted product ${product.id} (scanned at ${new Date(product.scannedAt).toISOString()})`);
  }

  if (productsToDelete.length > 0) {
    console.log(`[historyRetention] Cleaned ${productsToDelete.length} old scan(s)`);
  } else {
    console.log('[historyRetention] No old scans to clean');
  }

  return productsToDelete.length;
}

/**
 * Calcule la date d'expiration d'un scan selon le plan
 */
export function getExpirationDate(subscription: Subscription | null, scannedAt: number): Date | null {
  if (!subscription || subscription.historyRetentionDays === 'unlimited') {
    return null; // Pas d'expiration
  }

  if (subscription.historyRetentionDays === 0) {
    return null; // Pas de rétention configurée
  }

  const retentionMs = subscription.historyRetentionDays * 24 * 60 * 60 * 1000;
  return new Date(scannedAt + retentionMs);
}

/**
 * Vérifie si un scan est expiré selon le plan
 */
export function isScanExpired(subscription: Subscription | null, scannedAt: number): boolean {
  const expirationDate = getExpirationDate(subscription, scannedAt);
  if (!expirationDate) {
    return false; // Pas d'expiration
  }

  return Date.now() > expirationDate.getTime();
}

/**
 * Retourne le nombre de jours restants avant expiration d'un scan
 */
export function getDaysUntilExpiration(subscription: Subscription | null, scannedAt: number): number | null {
  const expirationDate = getExpirationDate(subscription, scannedAt);
  if (!expirationDate) {
    return null; // Pas d'expiration
  }

  const now = Date.now();
  const daysRemaining = Math.ceil((expirationDate.getTime() - now) / (24 * 60 * 60 * 1000));
  return Math.max(0, daysRemaining);
}
