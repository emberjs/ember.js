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

  plugins: [...baseConfig.plugins],
};
