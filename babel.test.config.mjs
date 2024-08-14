/*
  This babel config governs Ember's test suite. It transpiles some things that
  our published build should not (because those things are left for apps to
  decide).

  See babel.config.mjs for the base config that's used for building for
  publication.
*/

import { createRequire } from 'node:module';
import vmBabelPlugins from '@glimmer/vm-babel-plugins';
import baseConfig from './babel.config.mjs';

const require = createRequire(import.meta.url);
const buildDebugMacroPlugin = require('./broccoli/build-debug-macro-plugin.js');
const isProduction = process.env.EMBER_ENV === 'production';

export default {
  ...baseConfig,

  presets: [
    [
      '@babel/preset-env',
      {
        targets: require('./config/targets.js'),
      },
    ],
  ],

  plugins: [
    ...baseConfig.plugins,
    buildDebugMacroPlugin(!isProduction),
    ...vmBabelPlugins({ isDebug: !isProduction }),
  ],
};
