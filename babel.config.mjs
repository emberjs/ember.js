import buildDebugMacroPlugin from './lib/build-debug-macro-plugin.js';

export default {
  plugins: [
    [
      '@babel/plugin-transform-typescript',
      {
        allowDeclareFields: true,
      },
    ],
    buildDebugMacroPlugin(process.env.EMBER_ENV !== 'production'),
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    ['@babel/plugin-proposal-class-properties', { loose: true }],
    [
      'babel-plugin-ember-template-compilation',
      // TODO: this is relying on the ember-template-compiler as built by
      // another clone of the repo, on main.
      { compilerPath: '../ember.js/dist/ember-template-compiler.js' },
    ],
  ],
};
