/**
 * scanPools — les DEUX réserves de scans, et leurs règles opposées.
 *
 *  - `scansRemaining` : réserve MENSUELLE de l'abonnement. Remise à
 *    `scansIncluded` à chaque changement de mois ; ce qui n'est pas consommé
 *    est PERDU, jamais reporté.
 *  - `packCredits` : scans achetés à l'unité. Aucune expiration, jamais remis
 *    à zéro.
 *
 * Un compteur unique ne peut pas porter les deux : en fin de mois, on ne
 * saurait plus distinguer ce qui relève de l'abonnement (périssable) de ce qui
 * a été payé à part (acquis).
 *
 * Module PUR, sans Firebase, pour être testable — le service, lui, ne fait que
 * lire et écrire Firestore autour de ces règles.
 */

export type ScanPools = {
  scansRemaining: number;
  packCredits: number;
};

/** Mois courant ('YYYY-MM'), clé de période de la réserve mensuelle. */
export function currentScanPeriodKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Répartit un document Firestore en deux réserves, y compris s'il date d'AVANT
 * la séparation : tout vivait alors dans `scansRemaining`, et le surplus au-delà
 * de `scansIncluded` correspondait aux packs achetés. C'est la convention
 * qu'utilisaient déjà le changement de plan et l'activation ; on la reprend
 * telle quelle pour ne rien retirer à personne.
 */
export function splitPools(data: {
  scansIncluded?: number;
  scansRemaining?: number;
  packCredits?: number | null;
}): ScanPools {
  const included = data.scansIncluded ?? 0;
  const remaining = data.scansRemaining ?? 0;
  if (data.packCredits === undefined || data.packCredits === null) {
    return {
      scansRemaining: Math.min(remaining, included),
      packCredits: Math.max(0, remaining - included)
    };
  }
  return { scansRemaining: remaining, packCredits: data.packCredits };
}

/**
 * Consomme des scans : la réserve MENSUELLE d'abord, les packs ensuite.
 *
 * Cet ordre sert l'utilisateur : les scans mensuels expirent en fin de mois,
 * les packs non. Entamer les packs en premier lui ferait perdre ce qu'il a payé
 * pendant qu'il laisse périmer ce qui est inclus.
 */
export function consumeFromPools(pools: ScanPools, count: number): ScanPools {
  const fromMonthly = Math.min(pools.scansRemaining, count);
  const fromPacks = Math.min(pools.packCredits, count - fromMonthly);
  return {
    scansRemaining: pools.scansRemaining - fromMonthly,
    packCredits: pools.packCredits - fromPacks
  };
}

/** Renouvellement mensuel : le mensuel repart de l'inclus, les packs sont intacts. */
export function renewMonthlyPool(pools: ScanPools, scansIncluded: number): ScanPools {
  return { scansRemaining: scansIncluded, packCredits: pools.packCredits };
}

/** Scans réellement disponibles : mensuel + packs. */
export function totalScansAvailable(pools: Partial<ScanPools> | null | undefined): number {
  if (!pools) return 0;
  return Math.max(0, pools.scansRemaining ?? 0) + Math.max(0, pools.packCredits ?? 0);
}
