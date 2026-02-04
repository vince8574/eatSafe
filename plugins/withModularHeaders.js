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

      // Add post_install hook to set modular headers for specific Firebase pods
      const postInstallAddition = `
    # Set minimum iOS deployment target and modular headers for Firebase
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.4'
      end
    end

    # Enable modular headers for Firebase pods only (not gRPC)
    installer.pod_targets.each do |pod|
      if pod.name.start_with?('Firebase') ||
         pod.name.start_with?('GoogleUtilities') ||
         pod.name.start_with?('RNFB') ||
         pod.name == 'GTMSessionFetcher'
        def pod.build_type
          Pod::BuildType.static_library
        end
      end
    end
`;

      // Add post_install additions
      if (!podfileContent.includes("pod.name.start_with?('Firebase')")) {
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
