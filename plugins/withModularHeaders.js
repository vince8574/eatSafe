const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      let podfileContent = fs.readFileSync(podfilePath, 'utf-8');

      // Add RNFirebase static framework flag at the top of Podfile
      if (!podfileContent.includes('$RNFirebaseAsStaticFramework')) {
        podfileContent = `$RNFirebaseAsStaticFramework = true\n\n${podfileContent}`;
      }

      // Add specific modular_headers for Firebase pods only
      const podModifications = `
# Firebase modular headers fix
pod 'GoogleUtilities', :modular_headers => true
pod 'FirebaseCore', :modular_headers => true
pod 'FirebaseCoreInternal', :modular_headers => true
pod 'FirebaseAuth', :modular_headers => true
pod 'FirebaseAuthInterop', :modular_headers => true
pod 'FirebaseAppCheckInterop', :modular_headers => true
pod 'FirebaseMessaging', :modular_headers => true
pod 'FirebaseMessagingInterop', :modular_headers => true
pod 'FirebaseFirestore', :modular_headers => true
pod 'FirebaseFirestoreInternal', :modular_headers => true
pod 'RecaptchaInterop', :modular_headers => true
pod 'GTMSessionFetcher', :modular_headers => true
`;

      // Find the target block and add the modifications
      if (!podfileContent.includes('Firebase modular headers fix')) {
        podfileContent = podfileContent.replace(
          /target '([^']+)' do/,
          `target '$1' do${podModifications}`
        );
      }

      // Add build setting to allow non-modular includes in framework modules
      // This is needed because React-Core headers are not modular
      const nonModularFix = `
  # Allow non-modular includes for React Native Firebase
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
    end
  end
`;

      if (!podfileContent.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
        // Find the post_install block and add the setting right after it opens
        podfileContent = podfileContent.replace(
          /(post_install do \|installer\|)/,
          `$1${nonModularFix}`
        );
      }

      fs.writeFileSync(podfilePath, podfileContent);

      return config;
    },
  ]);
};
