const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      let podfileContent = fs.readFileSync(podfilePath, 'utf-8');

      // Add configuration at the top of Podfile
      const podfileHeader = `$RNFirebaseAsStaticFramework = true

# Modular headers for Firebase Swift pods
pod 'FirebaseCore', :modular_headers => true
pod 'FirebaseCoreInternal', :modular_headers => true
pod 'FirebaseCoreExtension', :modular_headers => true
pod 'FirebaseAuth', :modular_headers => true
pod 'FirebaseAuthInterop', :modular_headers => true
pod 'FirebaseAppCheckInterop', :modular_headers => true
pod 'FirebaseFirestoreInternal', :modular_headers => true
pod 'FirebaseMessagingInterop', :modular_headers => true
pod 'FirebaseSharedSwift', :modular_headers => true
pod 'GoogleUtilities', :modular_headers => true
pod 'RecaptchaInterop', :modular_headers => true
pod 'GTMSessionFetcher', :modular_headers => true

`;

      if (!podfileContent.includes('$RNFirebaseAsStaticFramework')) {
        podfileContent = podfileHeader + podfileContent;
      }

      fs.writeFileSync(podfilePath, podfileContent);

      return config;
    },
  ]);
};
