import { defineConfig, Plugin } from 'vite';
import { babel } from '@rollup/plugin-babel';
import { packageName as getPackageName, PackageCache, hbsToJS } from '@embroider/shared-internals';
import { resolve } from 'path';
import { readFileSync } from 'fs';

const babelPlugin = {
  enforce: 'pre',
  ...babel({
    extensions: ['.ts', '.js'],
  }),
} as Plugin;

const requireShim: Plugin = {
  name: 'require-shim',
  resolveId(imported, importer) {
    if (imported === 'require') {
      return '\0require-shim';
    }
  },
  load(id) {
    if (id === '\0require-shim') {
      return `export function has(name) {
  return window.require.has(name);
}
export default window.require;`;
    }
  },
};

let packageCache = new PackageCache(__dirname);

// https://github.com/vitejs/vite/issues/9731
const viteResolverBug: Plugin = {
  name: 'vite-resolver-bug',
  resolveId(imported, importer) {
    let packageName = getPackageName(imported);
    if (packageName && importer) {
      let owner = packageCache.ownerOfFile(importer);
      if (owner?.name === packageName) {
        // Our workaround for a vite bug also hits an actual node bug.🤡 You'd
        // think we could pass `paths` to require.resolve in order to do the
        // self-reference resolution ourselves, but you'd be wrong.
        // https://github.com/nodejs/node/issues/47681
        //
        // So instead we have a very minimalist and incomplete implementation
        // that's just good enough for the features we use
        let hit = owner.packageJSON.exports?.['.' + imported.slice(packageName.length)];
        if (hit) {
          return {
            id: resolve(owner.root, hit),
          };
        }
      }
    }
  },
};

const hbs: Plugin = {
  name: 'hbs',
  load(id) {
    if (id[0] !== '\0' && id.endsWith('.hbs')) {
      let input = readFileSync(id, 'utf8');
      let code = hbsToJS(input);
      return {
        code,
      };
    }
  },
};

export default defineConfig({
  resolve: {
    alias: {
      'backburner.js': 'backburner.js/dist/es6/backburner.js'
    },
  },
  plugins: [requireShim, babelPlugin, viteResolverBug, hbs],
  optimizeDeps: {
    disabled: true,
  },
});
