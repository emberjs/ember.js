'use strict';

// `lib/index.cjs` of the gxt-native Ember package (assembled by
// scripts/build-gxt-native-package.mjs). ember-cli and Embroider's classic
// compat layer load an Ember addon's main; this package cannot work there —
// its templates must be compiled by the gxt compiler (there is no Glimmer VM to
// run wire-format templates) — so loading it fails with the fix instead of
// producing an app that breaks at runtime.
// Runs as <package>/lib/index.cjs, next to the package's package.json.
// eslint-disable-next-line n/no-missing-require
const { name, version } = require('../package.json');

throw new Error(
  `${name}@${version} runs Ember on @lifeart/gxt (no Glimmer VM) and is consumed through Vite ` +
    `with its preset: \`import { emberGxtNative } from 'ember-source/vite'\` in vite.config ` +
    `(\`'${name}/vite'\` when installed under its own name). ` +
    `ember-cli and @embroider/compat builds (which compile templates with ` +
    `babel-plugin-ember-template-compilation) are not supported.`
);
