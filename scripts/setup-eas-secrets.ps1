# Script PowerShell pour configurer les secrets EAS pour la production
# Usage: .\scripts\setup-eas-secrets.ps1

Write-Host "🔐 Configuration des secrets EAS pour Numeline" -ForegroundColor Cyan
Write-Host ""

# Vérifier si EAS CLI est installé
try {
    eas --version | Out-Null
    Write-Host "✅ EAS CLI détecté" -ForegroundColor Green
} catch {
    Write-Host "❌ EAS CLI n'est pas installé" -ForegroundColor Red
    Write-Host "Installez-le avec: npm install -g eas-cli" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Vérifier si l'utilisateur est connecté
try {
    eas whoami | Out-Null
    Write-Host "✅ Connecté à EAS" -ForegroundColor Green
} catch {
    Write-Host "❌ Vous n'êtes pas connecté à EAS" -ForegroundColor Red
    Write-Host "Connectez-vous avec: eas login" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Lire la clé depuis .env si elle existe
$API_KEY = ""
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match 'EXPO_PUBLIC_VISION_API_KEY=(.+)') {
        $API_KEY = $matches[1].Trim()
    }
}

# Demander la clé si elle n'est pas dans .env
if ([string]::IsNullOrEmpty($API_KEY)) {
    Write-Host "⚠️  Clé API non trouvée dans .env" -ForegroundColor Yellow
    $secureString = Read-Host "Entrez votre Google Vision API Key" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureString)
    $API_KEY = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    Write-Host ""
}

if ([string]::IsNullOrEmpty($API_KEY)) {
    Write-Host "❌ Aucune clé API fournie" -ForegroundColor Red
    exit 1
}

Write-Host "📝 Création du secret EXPO_PUBLIC_VISION_API_KEY..." -ForegroundColor Yellow

# Supprimer l'ancien secret s'il existe (ignore les erreurs)
eas secret:delete --name EXPO_PUBLIC_VISION_API_KEY 2>$null

# Créer le nouveau secret
eas secret:create --scope project --name EXPO_PUBLIC_VISION_API_KEY --value $API_KEY

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Secret EXPO_PUBLIC_VISION_API_KEY créé" -ForegroundColor Green
} else {
    Write-Host "❌ Erreur lors de la création du secret" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📝 Création du secret EXPO_PUBLIC_VISION_ENDPOINT..." -ForegroundColor Yellow

# Supprimer l'ancien secret s'il existe
eas secret:delete --name EXPO_PUBLIC_VISION_ENDPOINT 2>$null

# Créer le secret pour l'endpoint
eas secret:create --scope project --name EXPO_PUBLIC_VISION_ENDPOINT --value "https://vision.googleapis.com/v1/images:annotate"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Secret EXPO_PUBLIC_VISION_ENDPOINT créé" -ForegroundColor Green
} else {
    Write-Host "❌ Erreur lors de la création du secret" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📋 Liste des secrets configurés:" -ForegroundColor Cyan
eas secret:list

Write-Host ""
Write-Host "✅ Configuration terminée!" -ForegroundColor Green
Write-Host ""
Write-Host "Vous pouvez maintenant builder votre app avec:" -ForegroundColor Cyan
Write-Host "  eas build --platform android --profile production" -ForegroundColor White
