const { withAppDelegate, withXcodeProject } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

/**
 * Expo config plugin to:
 * 1. Inject FirebaseApp.configure() into a Swift AppDelegate
 * 2. Copy GoogleService-Info.plist from project root to ios/Numeline/ and add it to the Xcode project
 *
 * Required because @react-native-firebase/app plugin only supports Objective-C.
 */
module.exports = function withFirebaseSwift(config) {
  // Step 1: Inject FirebaseApp.configure() into Swift AppDelegate
  config = withAppDelegate(config, (config) => {
    const appDelegate = config.modResults;

    if (appDelegate.language !== 'swift') {
      return config;
    }

    if (!appDelegate.contents.includes('import FirebaseCore')) {
      appDelegate.contents = appDelegate.contents.replace(
        'import ReactAppDependencyProvider',
        'import FirebaseCore\nimport ReactAppDependencyProvider'
      );
    }

    if (!appDelegate.contents.includes('FirebaseApp.configure()')) {
      appDelegate.contents = appDelegate.contents.replace(
        'let delegate = ReactNativeDelegate()',
        'FirebaseApp.configure()\n\n    let delegate = ReactNativeDelegate()'
      );
    }

    return config;
  });

  // Step 2: Copy GoogleService-Info.plist and register it in the Xcode project
  config = withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const { projectRoot, platformProjectRoot, projectName } = config.modRequest;

    const srcPlist = path.join(projectRoot, 'GoogleService-Info.plist');
    const destDir = path.join(platformProjectRoot, projectName);
    const destPlist = path.join(destDir, 'GoogleService-Info.plist');

    // Copy plist from project root to ios/Numeline/ if it exists
    if (fs.existsSync(srcPlist)) {
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(srcPlist, destPlist);
      console.log('[withFirebaseSwift] Copied GoogleService-Info.plist to', destPlist);
    } else {
      console.warn('[withFirebaseSwift] GoogleService-Info.plist not found at project root — skipping copy (local build)');
    }

    // Add plist to Xcode project bundle resources if not already referenced
    if (!xcodeProject.hasFile('GoogleService-Info.plist')) {
      xcodeProject.addResourceFile('GoogleService-Info.plist', {
        target: xcodeProject.getFirstTarget().uuid,
        lastKnownFileType: 'text.plist.xml',
      });
    }

    return config;
  });

  return config;
};
