const buildDebugMacroPlugin = require('./lib/build-debug-macro-plugin');

module.exports = {
  plugins: [
    '@babel/plugin-transform-typescript',
    buildDebugMacroPlugin(process.env.EMBER_ENV === 'production'),
  ],
};
