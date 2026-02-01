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
use_modular_headers!

# Disable modular headers for gRPC (not compatible)
pod 'gRPC-Core', :modular_headers => false
pod 'gRPC-C++', :modular_headers => false
pod 'abseil', :modular_headers => false

`;

      if (!podfileContent.includes('$RNFirebaseAsStaticFramework')) {
        podfileContent = podfileHeader + podfileContent;
      }

      // Add post_install hook to fix duplicate xcprivacy bundle issue
      const postInstallFix = `
  # Fix duplicate xcprivacy bundle issue - give each bundle a unique name
  installer.pods_project.targets.each do |target|
    if target.name.include?('xcprivacy')
      target.build_configurations.each do |config|
        config.build_settings['PRODUCT_NAME'] = target.name
        config.build_settings['INFOPLIST_KEY_CFBundleDisplayName'] = target.name
      end
    end
  end
`;

      if (podfileContent.includes('post_install do |installer|') &&
          !podfileContent.includes('Fix duplicate xcprivacy')) {
        podfileContent = podfileContent.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|${postInstallFix}`
        );
      }

      fs.writeFileSync(podfilePath, podfileContent);

      return config;
    },
  ]);
};
