/* global process */

import { defineConfig } from 'vite';
import { babel } from '@rollup/plugin-babel';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import {
  version,
  resolvePackages,
  exposedDependencies,
  hiddenDependencies,
} from './rollup.config.mjs';
import { templateTag } from '@embroider/vite';

const require = createRequire(import.meta.url);
const projectRoot = dirname(fileURLToPath(import.meta.url));
const { packageName: getPackageName, PackageCache } = require('@embroider/shared-internals');

export default defineConfig(({ mode }) => {
  process.env.EMBER_ENV = mode;

  const build = {
    rollupOptions: {
      preserveEntrySignatures: 'strict',
      input: ['index.html'],
      output: {
        preserveModules: true,
      },
      treeshake: false,
    },
    minify: mode === 'production',
  };

  return {
    plugins: [
      templateTag(),
      ...(process.env.VITE_STABLE_DECORATORS === 'typescript' ? [typescriptEmit()] : []),
      babel({
        babelHelpers: 'bundled',
        extensions: ['.js', '.ts', '.gjs', '.gts'],
        configFile: resolve(dirname(fileURLToPath(import.meta.url)), './babel.test.config.mjs'),
      }),
      resolvePackages(
        {
          ...exposedDependencies(),
          ...hiddenDependencies(),
          // @glimmer/component is published separately and gets its own rollup build,
          // so it's not part of ember-source's build graph.
          // Point the test suite at its source,
          // so tests exercise what's in git instead of whatever is in its dist/ directory.
          '@glimmer/component': resolve(projectRoot, 'packages/@glimmer/component/src/index.ts'),
        },
        { enableLocalDebug: true }
      ),
      viteResolverBug(),
      version(),
    ],
    // `@glimmer/component` is published as its own v2 addon and is only built
    // (into `dist/`) by `rollup.config.mjs`. Tests run straight off source, so
    // point the bare specifier at the TypeScript entrypoint instead.
    resolve: {
      alias: [
        {
          find: /^@glimmer\/component$/,
          replacement: resolve(projectRoot, 'packages/@glimmer/component/src/index.ts'),
        },
      ],
    },
    optimizeDeps: { noDiscovery: true, include: ['expect-type'] },
    publicDir: 'tests/public',
    build,

    // the stock esbuild support for typescript is horribly broken.
    // For example, it will remove your decorators.
    esbuild: false,
    envPrefix: ['VM_', 'VITE_'],
  };
});

// Compiles our sources with TypeScript's own emit (with standard decorators)
// before babel sees them, so we can test Ember against TypeScript's decorator
// implementation rather than babel's.
function typescriptEmit() {
  const ts = require('typescript');
  return {
    name: 'typescript-emit',
    // TypeScript's emit only provides decorator metadata if `Symbol.metadata`
    // exists, which it doesn't in browsers yet. Ember relies on that metadata,
    // so apps using TypeScript's emit must polyfill it, as we do here.
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          children: `Symbol.metadata ??= Symbol('Symbol.metadata');`,
          injectTo: 'head-prepend',
        },
      ];
    },
    transform(code, id) {
      let [file] = id.split('?');
      if (file.includes('/node_modules/') || !/\.(js|ts|gjs|gts)$/.test(file)) {
        return;
      }
      let { outputText, sourceMapText } = ts.transpileModule(code, {
        // TypeScript doesn't know about .gjs/.gts,
        // which templateTag() has already turned into plain JS/TS by this point.
        fileName: file.replace(/\.gjs$/, '.js').replace(/\.gts$/, '.ts'),
        compilerOptions: {
          // ES2022 rather than ESNext, since for ESNext TypeScript leaves
          // decorators as-is instead of compiling them.
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          experimentalDecorators: false,
          allowJs: true,
          sourceMap: true,
        },
      });
      return {
        code: outputText.replace(/^\/\/# sourceMappingURL=.*$/m, ''),
        map: sourceMapText,
      };
    },
  };
}

function viteResolverBug() {
  const packageCache = new PackageCache(projectRoot);
  // https://github.com/vitejs/vite/issues/9731
  return {
    name: 'vite-resolver-bug',
    resolveId(imported, importer) {
      let packageName = getPackageName(imported);
      if (packageName && importer) {
        let owner = packageCache.ownerOfFile(importer);
        if (owner?.name === packageName) {
          // Our workaround for a vite bug also hits an actual node bug 🤡.
          // You'd think we could pass `paths` to require.resolve,
          // in order to do the self-reference resolution ourselves, but you'd be wrong.
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
}
