// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./replace.d.ts" />

// originally from: https://github.com/vitejs/vite/blob/51e9c83458e30e3ce70abead14e02a7b353322d9/src/node/build/buildPluginReplace.ts

const { default: MagicString } = await import('magic-string');

/** @typedef {import("rollup").TransformResult} TransformResult */
/** @typedef {import("rollup").Plugin} RollupPlugin */

/**
 * @param {(id: string) => boolean} test
 * @param {Record<string, string>} replacements
 * @param {boolean} sourcemap
 *
 * @returns {RollupPlugin}
 */
export function createReplacePlugin(test, replacements, sourcemap) {
  const pattern = new RegExp(
    '\\b(' +
      Object.keys(replacements)
        .map((str) => {
          return str.replace(/[$()*+\-./?[\\\]^{|}]/gu, '\\$&');
        })
        .join('|') +
      ')\\b',
    'g'
  );

  return {
    name: 'starbeam:replace',
    /**
     * @param {string} code
     * @param {string} id
     * @returns {import("rollup").TransformResult}
     */
    transform(code, id) {
      if (test(id)) {
        const s = new MagicString(code);
        let hasReplaced = false;

        /** @type {RegExpMatchArray | null} */
        let match;

        while ((match = pattern.exec(code))) {
          hasReplaced = true;
          const start = /** @type {number} */ (match.index);
          const [wholeMatch, partialMatch] = /** @type {[string, string]} */ (match);

          const end = start + wholeMatch.length;
          const replacement = replacements[partialMatch];

          if (replacement === undefined) {
            throw new Error(
              `Unexpected missing replacement for "${partialMatch}".\n\nReplacements were ${JSON.stringify(
                replacements,
                null,
                2
              )}`
            );
          }

          s.overwrite(start, end, replacement);
        }

        if (!hasReplaced) {
          return null;
        }

        /** @type {TransformResult} */
        const result = { code: s.toString() };
        if (sourcemap) {
          result.map = s.generateMap({ hires: true });
        }
        return result;
      }
    },
  };
}
