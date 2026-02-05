const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      let podfileContent = fs.readFileSync(podfilePath, 'utf-8');

      // Add static framework configuration at the top
      const podfileHeader = `$RNFirebaseAsStaticFramework = true

# Use static frameworks for Firebase compatibility
use_frameworks! :linkage => :static

`;

      if (!podfileContent.includes('$RNFirebaseAsStaticFramework')) {
        podfileContent = podfileHeader + podfileContent;
      }

      // Add post_install hook for deployment target and code signing
      const postInstallAddition = `
    # Set minimum iOS deployment target and disable code signing for pods
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.4'
        config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
        config.build_settings['CODE_SIGN_IDENTITY'] = ''
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
