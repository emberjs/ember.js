const buildDebugMacroPlugin = require('./lib/build-debug-macro-plugin');

module.exports = {
  plugins: [
    [
      '@babel/plugin-transform-typescript',
      {
        allowDeclareFields: true,
      },
    ],
    buildDebugMacroPlugin(process.env.EMBER_ENV === 'production'),
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    ['@babel/plugin-proposal-class-properties', { loose: true }],
    ['babel-plugin-ember-template-compilation', {}],
  ],
};
