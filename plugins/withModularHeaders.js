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

      // Add post_install hook to allow non-modular includes
      // This is needed because React-Core headers are not modular
      const postInstallHook = `
post_install do |installer|
  # Allow non-modular includes for React Native Firebase with use_frameworks
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
    end
  end

  # Call the original post_install from Expo if it exists
  react_native_post_install(installer) if defined?(react_native_post_install)
end
`;

      // Check if there's already a post_install block
      if (podfileContent.includes('post_install do |installer|')) {
        // Inject our settings into the existing post_install block
        podfileContent = podfileContent.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|
  # Allow non-modular includes for React Native Firebase with use_frameworks
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
    end
  end
`
        );
      } else {
        // Add a new post_install block at the end
        podfileContent += postInstallHook;
      }

      fs.writeFileSync(podfilePath, podfileContent);

      return config;
    },
  ]);
};
