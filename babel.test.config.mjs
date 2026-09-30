/*
  This babel config governs Ember's test suite.
  It transpiles some things that our published build should not,
  because apps decide those things for themselves.

  See babel.config.mjs for the base config that the published build uses.
*/

import { createRequire } from 'node:module';
import baseConfig from './babel.config.mjs';

// eslint-disable-next-line no-redeclare
const require = createRequire(import.meta.url);
const buildDebugMacroPlugin = require('./broccoli/build-debug-macro-plugin.cjs');
const isProduction = process.env.EMBER_ENV === 'production';

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

  plugins: [...baseConfig.plugins, ...buildDebugMacroPlugin(!isProduction)],
};
