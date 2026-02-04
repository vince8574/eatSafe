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

      // Add pre_install hook for Firebase Swift compatibility
      const preInstallHook = `
pre_install do |installer|
  installer.pod_targets.each do |pod|
    if pod.name.eql?('RNFBAuth') || pod.name.eql?('RNFBApp') || pod.name.eql?('RNFBFirestore')
      def pod.build_type
        Pod::BuildType.static_library
      end
    end
  end
end
`;

      // Add post_install hook for build settings
      const postInstallAddition = `
    # Fix for Firebase Swift headers - only apply to Firebase pods
    firebase_pods = ['FirebaseCore', 'FirebaseAuth', 'FirebaseFirestore', 'FirebaseCoreInternal', 'FirebaseCoreExtension', 'FirebaseAuthInterop', 'FirebaseAppCheckInterop', 'FirebaseFirestoreInternal', 'FirebaseMessagingInterop', 'FirebaseSharedSwift', 'RNFBApp', 'RNFBAuth', 'RNFBFirestore']
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.4'
        if firebase_pods.include?(target.name)
          config.build_settings['BUILD_LIBRARY_FOR_DISTRIBUTION'] = 'YES'
        end
      end
    end
`;

      // Insert pre_install hook before target
      if (!podfileContent.includes('pre_install do |installer|')) {
        const targetMatch = podfileContent.match(/target ['"].*['"] do/);
        if (targetMatch) {
          podfileContent = podfileContent.replace(
            targetMatch[0],
            preInstallHook + '\n' + targetMatch[0]
          );
        }
      }

      // Add post_install additions
      if (!podfileContent.includes('BUILD_LIBRARY_FOR_DISTRIBUTION')) {
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
