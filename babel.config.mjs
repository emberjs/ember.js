/*
  This babel config governs how Ember gets built for publication. Features that
  remain un-transpiled until used by an app are not handled here.

  See babel.test.config.mjs for the extension to this config that governs our
  test suite.
*/

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
    // Template compilation handled by Vite via gxt compiler or templateTag plugin
  ],
};
