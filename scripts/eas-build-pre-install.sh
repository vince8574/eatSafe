#!/bin/bash

set -euo pipefail

echo "[eas-build-pre-install] Start (platform: ${EAS_BUILD_PLATFORM:-unknown})"

prepare_android_google_services() {
  mkdir -p android/app

  if [ -n "${GOOGLE_SERVICES_JSON:-}" ] && [ -f "${GOOGLE_SERVICES_JSON}" ]; then
    cp "${GOOGLE_SERVICES_JSON}" android/app/google-services.json
    echo "[eas-build-pre-install] Using GOOGLE_SERVICES_JSON file secret"
    return
  fi

  if [ -n "${GOOGLE_SERVICES_JSON_BASE64:-}" ]; then
    printf '%s' "${GOOGLE_SERVICES_JSON_BASE64}" | base64 --decode > android/app/google-services.json
    echo "[eas-build-pre-install] Using GOOGLE_SERVICES_JSON_BASE64 env secret"
    return
  fi

  if [ -f "google-services.json" ]; then
    cp google-services.json android/app/google-services.json
    echo "[eas-build-pre-install] Using ./google-services.json from project root"
    return
  fi

  if [ -f "android/app/google-services.json" ]; then
    echo "[eas-build-pre-install] Using existing android/app/google-services.json"
    return
  fi

  echo "[eas-build-pre-install] ERROR: Missing google-services.json for Android build"
  echo "[eas-build-pre-install] Provide one of:"
  echo "  1) EAS file secret: GOOGLE_SERVICES_JSON"
  echo "  2) Local file: ./google-services.json"
  exit 1
}

prepare_ios_google_service_info() {
  mkdir -p ios/Numeline

  if [ -n "${GOOGLE_SERVICE_INFO_PLIST:-}" ] && [ -f "${GOOGLE_SERVICE_INFO_PLIST}" ]; then
    cp "${GOOGLE_SERVICE_INFO_PLIST}" ios/Numeline/GoogleService-Info.plist
    echo "[eas-build-pre-install] Using GOOGLE_SERVICE_INFO_PLIST file secret"
    return
  fi

  if [ -n "${GOOGLE_SERVICE_INFO_PLIST_BASE64:-}" ]; then
    printf '%s' "${GOOGLE_SERVICE_INFO_PLIST_BASE64}" | base64 --decode > ios/Numeline/GoogleService-Info.plist
    echo "[eas-build-pre-install] Using GOOGLE_SERVICE_INFO_PLIST_BASE64 env secret"
    return
  fi

  if [ -f "GoogleService-Info.plist" ]; then
    cp GoogleService-Info.plist ios/Numeline/GoogleService-Info.plist
    echo "[eas-build-pre-install] Using ./GoogleService-Info.plist from project root"
    return
  fi

  if [ -f "ios/Numeline/GoogleService-Info.plist" ]; then
    echo "[eas-build-pre-install] Using existing ios/Numeline/GoogleService-Info.plist"
    return
  fi

  echo "[eas-build-pre-install] ERROR: Missing GoogleService-Info.plist for iOS build"
  echo "[eas-build-pre-install] Provide one of:"
  echo "  1) EAS file secret: GOOGLE_SERVICE_INFO_PLIST"
  echo "  2) Local file: ./GoogleService-Info.plist"
  exit 1
}

prepare_ios_brands_assets() {
  mkdir -p ios/Numeline/Resources

  if [ -f "src/data/brands.json" ]; then
    cp src/data/brands.json ios/Numeline/Resources/brands.json
    echo "[eas-build-pre-install] Copied src/data/brands.json to ios/Numeline/Resources"
    return
  fi

  echo "[eas-build-pre-install] Warning: src/data/brands.json not found"
}

if [ "${EAS_BUILD_PLATFORM:-}" = "android" ]; then
  prepare_android_google_services
elif [ "${EAS_BUILD_PLATFORM:-}" = "ios" ]; then
  prepare_ios_google_service_info
  prepare_ios_brands_assets
else
  echo "[eas-build-pre-install] Unknown platform, skipping platform-specific setup"
fi

echo "[eas-build-pre-install] Completed"
