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

      fs.writeFileSync(podfilePath, podfileContent);

      return config;
    },
  ]);
};
