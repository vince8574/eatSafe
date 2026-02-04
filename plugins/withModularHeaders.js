const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      let podfileContent = fs.readFileSync(podfilePath, 'utf-8');

      // Add static framework flag at the top
      if (!podfileContent.includes('$RNFirebaseAsStaticFramework')) {
        podfileContent = '$RNFirebaseAsStaticFramework = true\n\n' + podfileContent;
      }

      // Add modular headers for Firebase dependencies inside target block
      const firebaseModularHeaders = `
  # Modular headers required for Firebase Swift pods
  pod 'FirebaseCore', :modular_headers => true
  pod 'FirebaseCoreExtension', :modular_headers => true
  pod 'FirebaseAuthInterop', :modular_headers => true
  pod 'FirebaseAppCheckInterop', :modular_headers => true
  pod 'FirebaseFirestoreInternal', :modular_headers => true
  pod 'GoogleUtilities', :modular_headers => true
  pod 'RecaptchaInterop', :modular_headers => true
`;

      // Insert modular headers after target line
      if (!podfileContent.includes("pod 'FirebaseCore', :modular_headers => true")) {
        const targetMatch = podfileContent.match(/target ['"].*['"] do/);
        if (targetMatch) {
          podfileContent = podfileContent.replace(
            targetMatch[0],
            targetMatch[0] + firebaseModularHeaders
          );
        }
      }

      // Add post_install hook for deployment target
      const postInstallAddition = `
    # Set minimum iOS deployment target
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.4'
      end
    end
`;

      // Add post_install additions
      if (!podfileContent.includes("config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']")) {
        podfileContent = podfileContent.replace(
          /post_install do \|installer\|/,
          'post_install do |installer|' + postInstallAddition
        );
      }

      fs.writeFileSync(podfilePath, podfileContent);

      return config;
    },
  ]);
};
