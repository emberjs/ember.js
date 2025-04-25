/*
  This babel config governs how Ember gets built for publication. Features that
  remain un-transpiled until used by an app are not handled here.

  See babel.test.config.mjs for the extension to this config that governs our
  test suite.
*/

import * as Compiler from './packages/ember-template-compiler/minimal.ts'

export default {
  plugins: [
    [
      '@babel/plugin-transform-typescript',
      {
        allowDeclareFields: true,
      },
    ],
    [
      'module:decorator-transforms',
      {
        runEarly: true,
        runtime: { import: 'decorator-transforms/runtime' },
      },
    ],
    [
      'babel-plugin-ember-template-compilation',
      {
        compiler: Compiler,
      },
    ],
  ],
};
