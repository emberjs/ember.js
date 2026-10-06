/*
  This babel config governs Ember's test suite. It transpiles some things that
  our published build should not (because those things are left for apps to
  decide).

  See babel.config.mjs for the base config that's used for building for
  publication.
*/

import { createRequire } from 'node:module';
import baseConfig from './babel.config.mjs';
import { buildMacros } from '@embroider/macros/babel';

// eslint-disable-next-line no-redeclare
const require = createRequire(import.meta.url);
const buildDebugMacroPlugin = require('./broccoli/build-debug-macro-plugin.cjs');
const isProduction = process.env.EMBER_ENV === 'production';

// @ember/test-helpers and @ember/test-waiters use @embroider/macros.
//
// buildMacros() reads NODE_ENV, but our builds select the mode with EMBER_ENV.
const macros = buildMacros({
  configure(config) {
    if (!isProduction) {
      config.enablePackageDevelopment(process.cwd());
    }
  },
});

export default {
  ...baseConfig,

  presets: [
    [
      '@babel/preset-env',
      {
        targets: require('./config/targets.cjs'),
      },
    ],
  ],

  plugins: [...baseConfig.plugins, ...macros.babelMacros, ...buildDebugMacroPlugin(!isProduction)],
};
