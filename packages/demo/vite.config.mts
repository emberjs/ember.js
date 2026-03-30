import { defineConfig } from 'vite';
import { compiler } from '@lifeart/gxt/compiler';
import { fileURLToPath, URL } from 'node:url';

const projectRoot = import.meta.url;

export default defineConfig(({ mode }) => ({
  plugins: [
    compiler(mode, {
      flags: {
        WITH_EMBER_INTEGRATION: true,
        WITH_HELPER_MANAGER: false,
        WITH_MODIFIER_MANAGER: true,
      },
    }),
  ],
  base: '',
  rollupOptions: {
    input: {
      main: 'index.html',
      tests: 'tests.html',
    },
  },
  optimizeDeps: {
    exclude: ['@glimmer/syntax', '@glimmer/compiler', '@lifeart/gxt', '@lifeart/gxt/glimmer-compatibility'],
  },
  resolve: {
    preserveSymlinks: true,
    alias: [
      { find: /^@\/(.+)/, replacement: '/src/$1' },
      {
        find: '@ember/template-compilation',
        replacement: fileURLToPath(new URL(`./compat/compile`, projectRoot)),
      },
      {
        find: '@ember/-internals/deprecations',
        replacement: fileURLToPath(new URL(`./compat/deprecate`, projectRoot)),
      },
      {
        find: '@glimmer/application',
        replacement: fileURLToPath(new URL(`./compat/glimmer-application`, projectRoot)),
      },
      {
        find: '@glimmer/utils',
        replacement: fileURLToPath(new URL(`./compat/glimmer-util`, projectRoot)),
      },
      {
        find: '@glimmer/manager',
        replacement: fileURLToPath(new URL(`./compat/manager`, projectRoot)),
      },
      {
        find: '@glimmer/validator',
        replacement: fileURLToPath(new URL(`./compat/validator`, projectRoot)),
      },
      {
        find: '@glimmer/destroyable',
        replacement: fileURLToPath(new URL(`./compat/destroyable`, projectRoot)),
      },
      {
        find: '@glimmer/reference',
        replacement: fileURLToPath(new URL(`./compat/reference`, projectRoot)),
      },
      {
        find: '@glimmer/env',
        replacement: fileURLToPath(new URL(`./compat/glimmer-env`, projectRoot)),
      },
      {
        find: '@glimmer/syntax',
        replacement: fileURLToPath(new URL(`./compat/glimmer-syntax`, projectRoot)),
      },
    ],
  },
}));
