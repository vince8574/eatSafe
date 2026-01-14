const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configuration d'obfuscation pour la production uniquement
if (process.env.NODE_ENV === 'production') {
  config.transformer = {
    ...config.transformer,
    minifierConfig: {
      // Supprime les noms de classes et fonctions
      keep_classnames: false,
      keep_fnames: false,

      // Renomme les variables et fonctions
      mangle: {
        toplevel: true,
      },

      // Optimisations et obfuscation du code
      compress: {
        // Supprime les console.log en production
        drop_console: true,
        drop_debugger: true,

        // Optimisations qui rendent le code plus difficile à lire
        reduce_vars: true,
        collapse_vars: true,

        // Simplifie les conditions
        conditionals: true,

        // Supprime le code mort
        dead_code: true,
        unused: true,
      },

      // Rend le code compact (difficile à lire)
      output: {
        comments: false,
        beautify: false,
      },
    },
  };
}

module.exports = config;
