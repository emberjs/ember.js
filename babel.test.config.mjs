/*
  This babel config governs Ember's test suite. It transpiles some things that
  our published build should not (because those things are left for apps to
  decide).

  See babel.config.mjs for the base config that's used for building for
  publication.
*/

import { createRequire } from 'node:module';
import baseConfig from './babel.config.mjs';

// eslint-disable-next-line no-redeclare
const require = createRequire(import.meta.url);
const buildDebugMacroPlugin = require('./broccoli/build-debug-macro-plugin.cjs');
const legacyFeatures = require('./broccoli/legacy-features.cjs');
const isProduction = process.env.EMBER_ENV === 'production';

// MODERN=1 folds the legacy-feature flags the way the modern build variant
// does (see vite.config.mjs, which applies the matching module swaps).
const legacyFlags = process.env.MODERN
  ? legacyFeatures.resolveFlags(legacyFeatures.MODERN_OVERRIDES)
  : legacyFeatures.DEFAULT_FLAGS;

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

  plugins: [
    ...baseConfig.plugins,
    ...buildDebugMacroPlugin(!isProduction),
    legacyFeatures(legacyFlags),
  ],
};
