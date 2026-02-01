const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      let podfileContent = fs.readFileSync(podfilePath, 'utf-8');

      // Add RNFirebase static framework flag at the top
      if (!podfileContent.includes('$RNFirebaseAsStaticFramework')) {
        podfileContent = `$RNFirebaseAsStaticFramework = true\n\n${podfileContent}`;
      }

      // Add post_install hooks for fixing build issues
      const postInstallFix = `
  # Allow non-modular includes in framework modules (needed for React Native + Firebase)
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      config.build_settings['BUILD_LIBRARY_FOR_DISTRIBUTION'] = 'YES'

      # Fix duplicate xcprivacy bundle issue
      if target.name.include?('xcprivacy')
        config.build_settings['PRODUCT_NAME'] = target.name
      end
    end
  end
`;

      if (podfileContent.includes('post_install do |installer|') &&
          !podfileContent.includes('Allow non-modular includes')) {
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
