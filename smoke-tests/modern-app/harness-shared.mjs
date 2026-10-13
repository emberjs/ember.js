// Shared by the modern-app harness configs: vite.config.mjs (ember built from
// SOURCE through the repo-root pipeline) and vite.dist.config.mjs (ember consumed
// from the ROLLUP dist, the way apps consume ember-source).
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_DIR = dirname(fileURLToPath(import.meta.url));
export const EMBER_ROOT = resolve(APP_DIR, '..', '..');

// ember-strict-application-resolver is an app dependency that does not live in
// packages/, so root resolvePackages() would throw "missing in resolvePackages".
// Alias it to the copy the other smoke-test apps already install.
export function strictResolverEntry() {
  const req = createRequire(join(EMBER_ROOT, 'smoke-tests/v2-app-gxt-template/package.json'));
  return req.resolve('ember-strict-application-resolver');
}

// Emits bundle-stats.json: the chunk graph (entry / static imports / dynamic
// imports) plus per-module rendered (pre-minify) lengths — the boot-set walk and
// a cross-check for the sourcemap-based byte inventory.
export function bundleStats(outDir) {
  return {
    name: 'modern-app-bundle-stats',
    generateBundle(_options, bundle) {
      const chunks = [];
      for (const item of Object.values(bundle)) {
        if (item.type !== 'chunk') continue;
        chunks.push({
          fileName: item.fileName,
          isEntry: item.isEntry,
          isDynamicEntry: item.isDynamicEntry,
          imports: item.imports,
          dynamicImports: item.dynamicImports,
          modules: Object.fromEntries(
            Object.entries(item.modules).map(([id, m]) => [
              id,
              {
                len: m.renderedLength,
                importers: (this.getModuleInfo(id)?.importers ?? []).slice(0, 5),
              },
            ])
          ),
        });
      }
      // Full importer graph (incl. modules tree-shaken to nothing, e.g. pure
      // re-export barrels) so "why is X in the bundle" walks reach the entry.
      const graph = {};
      for (const id of this.getModuleIds()) graph[id] = this.getModuleInfo(id)?.importers ?? [];
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, 'bundle-stats.json'), JSON.stringify({ chunks, graph }, null, 1));
    },
  };
}
