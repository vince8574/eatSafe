#!/bin/bash
# Script pour configurer les secrets EAS pour la production
# Usage: ./scripts/setup-eas-secrets.sh

echo "🔐 Configuration des secrets EAS pour Numeline"
echo ""

# Vérifier si EAS CLI est installé
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI n'est pas installé"
    echo "Installez-le avec: npm install -g eas-cli"
    exit 1
fi

echo "✅ EAS CLI détecté"
echo ""

# Vérifier si l'utilisateur est connecté
if ! eas whoami &> /dev/null; then
    echo "❌ Vous n'êtes pas connecté à EAS"
    echo "Connectez-vous avec: eas login"
    exit 1
fi

echo "✅ Connecté à EAS"
echo ""

# Lire la clé depuis .env si elle existe
if [ -f .env ]; then
    source .env
    API_KEY=$EXPO_PUBLIC_VISION_API_KEY
else
    echo "⚠️  Fichier .env introuvable"
    API_KEY=""
fi

# Demander la clé si elle n'est pas dans .env
if [ -z "$API_KEY" ]; then
    echo "Entrez votre Google Vision API Key:"
    read -s API_KEY
    echo ""
fi

if [ -z "$API_KEY" ]; then
    echo "❌ Aucune clé API fournie"
    exit 1
fi

echo "📝 Création du secret EXPO_PUBLIC_VISION_API_KEY..."

# Créer le secret (supprime l'ancien si existe)
eas secret:delete --name EXPO_PUBLIC_VISION_API_KEY 2>/dev/null || true
eas secret:create --scope project --name EXPO_PUBLIC_VISION_API_KEY --value "$API_KEY"

if [ $? -eq 0 ]; then
    echo "✅ Secret EXPO_PUBLIC_VISION_API_KEY créé"
else
    echo "❌ Erreur lors de la création du secret"
    exit 1
fi

echo ""
echo "📝 Création du secret EXPO_PUBLIC_VISION_ENDPOINT..."

# Créer le secret pour l'endpoint
eas secret:delete --name EXPO_PUBLIC_VISION_ENDPOINT 2>/dev/null || true
eas secret:create --scope project --name EXPO_PUBLIC_VISION_ENDPOINT --value "https://vision.googleapis.com/v1/images:annotate"

if [ $? -eq 0 ]; then
    echo "✅ Secret EXPO_PUBLIC_VISION_ENDPOINT créé"
else
    echo "❌ Erreur lors de la création du secret"
    exit 1
fi

echo ""
echo "📋 Liste des secrets configurés:"
eas secret:list

echo ""
echo "✅ Configuration terminée!"
echo ""
echo "Vous pouvez maintenant builder votre app avec:"
echo "  eas build --platform android --profile production"
