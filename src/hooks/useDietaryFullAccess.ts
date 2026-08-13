import { useSubscriptionStatus } from './useSubscriptionStatus';

/**
 * Accès COMPLET au module régime : tous les profils de la famille sont analysés
 * ET affichés, au lieu du seul profil « actif ».
 *
 * Ouvert aux abonnés, mais AUSSI tant qu'il reste des scans offerts à
 * l'installation. C'est délibéré : le module régime est ce qui donne sa valeur
 * au produit pour une famille, et le découvrir bridé à une seule personne dès le
 * premier scan ne donne aucune raison de s'abonner. On montre donc ce qu'on
 * vend, puis le verrou tombe naturellement quand les scans offerts sont épuisés
 * — au moment précis où l'écran d'abonnement est déjà proposé.
 *
 * Pendant le chargement du statut, on AUTORISE : mieux vaut afficher un profil
 * de trop une fraction de seconde que faire clignoter un cadenas chez un abonné.
 */
export function useDietaryFullAccess(): boolean {
  const { isSubscribed, subscription, loading } = useSubscriptionStatus();
  if (loading || isSubscribed) return true;
  return (subscription?.scansRemaining ?? 0) > 0;
}
