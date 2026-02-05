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

      // Add use_frameworks! inside the target block
      if (!podfileContent.includes('use_frameworks!')) {
        const targetMatch = podfileContent.match(/target ['"].*['"] do/);
        if (targetMatch) {
          podfileContent = podfileContent.replace(
            targetMatch[0],
            targetMatch[0] + '\n  use_frameworks! :linkage => :static\n'
          );
        }
      }

      // Add post_install hook settings
      const postInstallAddition = `
    # Fix for React Native + Firebase framework compatibility
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.4'
        config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
        config.build_settings['CODE_SIGN_IDENTITY'] = ''
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
`;

      // Add post_install additions
      if (!podfileContent.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
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
