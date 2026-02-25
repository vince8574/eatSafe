const { withAppDelegate } = require('@expo/config-plugins');

/**
 * Expo config plugin to inject FirebaseApp.configure() into a Swift AppDelegate.
 * Required because @react-native-firebase/app plugin only supports Objective-C.
 */
module.exports = function withFirebaseSwift(config) {
  return withAppDelegate(config, (config) => {
    const appDelegate = config.modResults;

    if (appDelegate.language !== 'swift') {
      return config;
    }

    // Add FirebaseCore import after existing imports
    if (!appDelegate.contents.includes('import FirebaseCore')) {
      appDelegate.contents = appDelegate.contents.replace(
        'import ReactAppDependencyProvider',
        'import FirebaseCore\nimport ReactAppDependencyProvider'
      );
    }

    // Add FirebaseApp.configure() before React Native setup
    if (!appDelegate.contents.includes('FirebaseApp.configure()')) {
      appDelegate.contents = appDelegate.contents.replace(
        'let delegate = ReactNativeDelegate()',
        'FirebaseApp.configure()\n\n    let delegate = ReactNativeDelegate()'
      );
    }

    return config;
  });
};
