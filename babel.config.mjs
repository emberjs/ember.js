import buildDebugMacroPlugin from './lib/build-debug-macro-plugin.js';
// import * as ETC from './packages/ember-template-compiler/index.ts';
export default {
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
    // ['babel-plugin-ember-template-compilation', { compiler: ETC }],
  ],
};
