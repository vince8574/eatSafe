const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      let podfileContent = fs.readFileSync(podfilePath, 'utf-8');

      // Add use_modular_headers! after use_frameworks! or at the beginning of target block
      if (!podfileContent.includes('use_modular_headers!')) {
        // Find the target line and add use_modular_headers! after it
        podfileContent = podfileContent.replace(
          /target '([^']+)' do/,
          `target '$1' do\n  use_modular_headers!`
        );

        fs.writeFileSync(podfilePath, podfileContent);
      }

      return config;
    },
  ]);
};
