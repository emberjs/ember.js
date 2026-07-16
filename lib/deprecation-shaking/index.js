import { readFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const emberSourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const FLAGS_MODULE_SUFFIX = ['packages', '@ember', 'deprecated-features', 'index.js'].join(sep);

// Numeric segment-wise comparison of dotted version strings (pre-release
// tags ignored), so multi-digit minors order correctly (3.28 > 3.4).
function versionLte(a, b) {
  let aParts = a.split('.').map((part) => parseInt(part, 10));
  let bParts = b.split('.').map((part) => parseInt(part, 10));
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    let diff = (aParts[i] || 0) - (bParts[i] || 0);
    if (diff !== 0) return diff < 0;
  }
  return true;
}

/**
  Vite/Rollup plugin that shakes deprecated code out of ember-source.

  Replaces ember-source's `@ember/deprecated-features` flags module so that
  the selected deprecations are disabled: their guarded implementations are
  dead-code-eliminated in production builds, and reaching a removed API
  throws the same error it would after the deprecation's `until` release.

  ```js
  // vite.config.mjs
  import { deprecationShaking } from 'ember-source/deprecation-shaking';

  export default defineConfig({
    plugins: [
      classicEmberSupport(),
      ember(),
      deprecationShaking({
        // shake everything with `until` at or below this ember-source version
        compliantThrough: '7.5.0',
        // and/or shake specific deprecation ids
        strip: ['deprecate-comparable-mixin'],
        // ids to keep even if compliantThrough covers them
        keep: [],
      }),
    ],
  });
  ```
*/
export function deprecationShaking({ compliantThrough, strip = [], keep = [] } = {}) {
  let meta = JSON.parse(readFileSync(resolve(emberSourceRoot, 'dist/deprecation-flags.json')));
  let knownIds = new Set(meta.map((entry) => entry.id));

  for (let id of [...strip, ...keep]) {
    if (!knownIds.has(id)) {
      throw new Error(
        `deprecationShaking: unknown deprecation id "${id}". Known shakable ids: ${[
          ...knownIds,
        ].join(', ')}`
      );
    }
  }

  let flags = Object.fromEntries(
    meta.map(({ const: name, id, until }) => {
      let shaken =
        (strip.includes(id) ||
          (compliantThrough !== undefined && versionLte(until, compliantThrough))) &&
        !keep.includes(id);
      return [name, !shaken];
    })
  );

  let code =
    Object.entries(flags)
      .map(([name, value]) => `export const ${name} = ${value};`)
      .join('\n') + '\n';

  return {
    name: 'ember-source-deprecation-shaking',
    enforce: 'pre',
    load(id) {
      // Match the resolved flags module by path so this works whether the
      // dist chunks import it via package self-reference or relative path.
      if (id.split('?')[0].endsWith(FLAGS_MODULE_SUFFIX) && id.includes(sep + 'dist' + sep)) {
        return code;
      }
    },
  };
}
