import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    exclude: ['content-tag', '@swc/wasm-web'],
    needsInterop: ['decorator-transforms'],
    // noDiscovery: true,
    // include: [
    //   'backburner.js',
    //   'babel-plugin-ember-template-compilation',
    //   '@babel/standalone',
    //   '@babel/plugin-proposal-decorators',
    //   '@babel/plugin-transform-class-properties',
    //   'babel-import-util',
    // ],
    // needsInterop: [
    //   '@babel/plugin-proposal-decorators',
    //   '@babel/plugin-transform-class-properties',
    //   'babel-import-util',
    // ],
  },
});
