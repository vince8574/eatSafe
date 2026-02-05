const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      let podfileContent = fs.readFileSync(podfilePath, 'utf-8');

      // 1. Add static framework flag at the top
      if (!podfileContent.includes('$RNFirebaseAsStaticFramework')) {
        podfileContent = '$RNFirebaseAsStaticFramework = true\n\n' + podfileContent;
      }

      // 2. Add modular headers for Firebase deps after use_expo_modules!
      if (!podfileContent.includes("pod 'FirebaseCore', :modular_headers => true")) {
        podfileContent = podfileContent.replace(
          'use_expo_modules!',
          `use_expo_modules!

  # Modular headers required by Firebase Swift pods
  pod 'FirebaseCore', :modular_headers => true
  pod 'FirebaseCoreExtension', :modular_headers => true
  pod 'FirebaseCoreInternal', :modular_headers => true
  pod 'FirebaseAuthInterop', :modular_headers => true
  pod 'FirebaseAppCheckInterop', :modular_headers => true
  pod 'FirebaseFirestoreInternal', :modular_headers => true
  pod 'GoogleUtilities', :modular_headers => true
  pod 'RecaptchaInterop', :modular_headers => true`
        );
      }

      // 3. Add post_install hook for deployment target and warning fixes
      if (!podfileContent.includes("config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.4'")) {
        podfileContent = podfileContent.replace(
          'post_install do |installer|',
          `post_install do |installer|
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        # Set minimum iOS deployment target
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.4'
        # Suppress nullability warnings (expo-file-system)
        config.build_settings['GCC_WARN_INHIBIT_ALL_WARNINGS'] = 'YES' if target.name == 'expo-file-system'
      end
    end`
        );
      }

      fs.writeFileSync(podfilePath, podfileContent);

      return config;
    },
  ]);
};
