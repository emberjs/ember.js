import fs from 'node:fs';

import { precompile } from '@glimmer/compiler';
import { defineConfig, type Plugin } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const self = import.meta.url;

const currentPath = path.dirname(fileURLToPath(self));
const packagesPath = path.resolve(currentPath, '..', '..', './../packages');

const packagePath = (name: string) => {
  return path.join(packagesPath, name, 'dist/prod/index.js');
};

export default defineConfig({
  plugins: [benchmark()],
  resolve: {
    alias: {
      '@glimmer-workspace/benchmark-env': '@glimmer-workspace/benchmark-env/index.ts',
      '@glimmer/debug': packagePath('@glimmer/debug'),
      '@/components': path.join(currentPath, 'lib', 'components'),
      '@/utils': path.join(currentPath, 'lib', 'utils'),
    },
  },
});

function benchmark(): Plugin {
  return {
    enforce: 'pre',
    name: '@glimmer/benchmark',
    resolveId(id) {
      if (id === '@glimmer/env') {
        return '\0@glimmer/env';
      } else if (id === '@glimmer/local-debug-flags') {
        return '\0@glimmer/local-debug-flags';
      }
    },
    load(id) {
      if (id === '\0@glimmer/env') {
        return `export const DEBUG = false;`;
      } else if (id === '\0@glimmer/local-debug-flags') {
        return `export const LOCAL_SHOULD_LOG = false;`;
      }
      /** @type {string | undefined} */
      let result: string | undefined;
      if (id.endsWith('.hbs')) {
        const source = fs.readFileSync(id, 'utf8');
        const compiled = precompile(source);
        result = `export default ${compiled};`;
      }
      return result;
    },
  };
}
