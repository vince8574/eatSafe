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

`;

      if (!podfileContent.includes('$RNFirebaseAsStaticFramework')) {
        podfileContent = podfileHeader + podfileContent;
      }

      fs.writeFileSync(podfilePath, podfileContent);

      return config;
    },
  ]);
};
