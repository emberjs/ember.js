import { defineConfig, Plugin } from 'vite';
import { babel as rollupBabel } from '@rollup/plugin-babel';
import { packageName as getPackageName, PackageCache, hbsToJS } from '@embroider/shared-internals';
import { relative, resolve } from 'path';
import { readFileSync } from 'fs';

export default defineConfig({
  resolve: {
    alias: {
      'backburner.js': 'backburner.js/dist/es6/backburner.js',
    },
  },
  plugins: [requireShim(), babel(), viteResolverBug(), hbs(), version()],
  optimizeDeps: {
    disabled: true,
  },
  build: {
    lib: {
      entry: {
        // TODO: this builds but we still have internal usage of require.has
        // that doesn't work this way yet.
        'ember-template-compiler': './packages/ember-template-compiler/index.ts',
      },
      formats: ['es', 'cjs']
    },
  },
});

function babel(): Plugin {
  return {
    enforce: 'pre',
    ...rollupBabel({
      extensions: ['.ts', '.js', '.hbs'],
    }),
  } as Plugin;
}

function requireShim(): Plugin {
  return {
    name: 'require-shim',
    resolveId(imported, importer) {
      if (imported === 'require') {
        return '\0require-shim';
      }
    },
    load(id) {
      if (id === '\0require-shim') {
        return `export function has(name) {
  return require.has(name);
}
export default require;`;
      }
    },
  };
}

function viteResolverBug(): Plugin {
  const packageCache = new PackageCache(__dirname);
  // https://github.com/vitejs/vite/issues/9731
  return {
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
      }`
    },
  };
}

function hbs(): Plugin {
  return {
    name: 'hbs',
    load(id) {
      if (id[0] !== '\0' && id.endsWith('.hbs')) {
        let input = readFileSync(id, 'utf8');
        let code = hbsToJS(input, { filename: relative(__dirname, id) });
        return {
          code,
        };
      }
    },
  };
}

function version(): Plugin {
  return {
    name: 'ember-version',
    load(id) {
      if (id[0] !== '\0' && id.endsWith('/ember/version.ts')) {
        let input = readFileSync(id, 'utf8');
        return {
          code: input.replace(
            'VERSION_GOES_HERE',
            JSON.parse(readFileSync('./package.json', 'utf8')).version
          ),
        };
      }
    },
  };
}
