/**
 * Inline a build-time constant (`__GXT_MODE__`, `__GXT_CLASSIC_COMPONENTS__`)
 * into first-party source, for both rollup.config.mjs and vite.config.mjs.
 *
 * Every bare `name` identifier becomes the literal `String(valueFor(id))`. The
 * matching follows `@rollup/plugin-replace` with `preventAssignment: true`
 * (which this repo does not depend on): a member access (`globalThis.name`),
 * an assignment target (`name = …`) and a declaration (`const name`,
 * `declare const name`) are left alone, so a write can never become
 * `globalThis.true = true`. Vite's `define` cannot do this job: it runs through
 * esbuild's source transform, which the vite configs disable.
 *
 * @param {string} name the identifier to replace
 * @param {(id: string) => unknown} valueFor the literal for a module id
 * @param {'pre' | 'post'} [enforce] vite plugin ordering
 */
export function replaceBuildConstant(name, valueFor, enforce) {
  const pattern = new RegExp(
    `(?<![\\w$.])(?<!\\b(?:const|let|var)\\s+)${name}(?![\\w$])(?!\\s*=(?!=))`,
    'g'
  );
  return {
    name: `replace-build-constant:${name}`,
    ...(enforce ? { enforce } : {}),
    transform(code, id) {
      const cleanId = id.split('?')[0].split('#')[0];
      if (cleanId.includes('/node_modules/')) return null;
      if (!code.includes(name)) return null;
      const replaced = code.replace(pattern, String(valueFor(cleanId)));
      if (replaced === code) return null;
      return { code: replaced, map: null };
    },
  };
}
