/**
 * ESLint rule: no-barrel-imports
 *
 * Disallows importing from barrel/entrypoint files of internal packages.
 * Internal source files should import directly from the specific lib/ file
 * to enable proper tree-shaking by bundlers.
 *
 * For example:
 *   Bad:  import { Renderer } from '@ember/-internals/glimmer';
 *   Good: import { Renderer } from '@ember/-internals/glimmer/lib/renderer';
 */

'use strict';

// Barrel packages that should not be imported directly from source files.
// Each entry maps a bare package specifier to a human-readable hint.
const BARREL_PACKAGES = new Map([
  [
    '@ember/-internals/glimmer',
    "Import from '@ember/-internals/glimmer/lib/...' instead of the barrel '@ember/-internals/glimmer'.",
  ],
  [
    '@ember/-internals/environment',
    "Import from '@ember/-internals/environment/lib/env' or '@ember/-internals/environment/lib/context' instead of the barrel '@ember/-internals/environment'.",
  ],
]);

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow imports from barrel/entrypoint files; require direct file imports instead',
    },
    messages: {
      noBarrelImport:
        "Do not import from the barrel '{{source}}'. {{hint}}",
    },
    schema: [], // no options
  },

  create(context) {
    // Only apply to files inside packages/ that are NOT test or type-test files.
    const filename = context.filename || context.getFilename();

    // Skip files outside packages/
    if (!filename.includes('/packages/')) {
      return {};
    }

    // Skip test and type-test files
    if (/\/(tests|type-tests)\//.test(filename)) {
      return {};
    }

    function check(node) {
      const source = node.source && node.source.value;
      if (typeof source !== 'string') return;

      const hint = BARREL_PACKAGES.get(source);
      if (hint) {
        context.report({
          node: node.source,
          messageId: 'noBarrelImport',
          data: { source, hint },
        });
      }
    }

    return {
      ImportDeclaration: check,
      // Also catch: export { foo } from '@ember/-internals/glimmer';
      ExportNamedDeclaration: check,
      // Also catch: export * from '@ember/-internals/glimmer';
      ExportAllDeclaration: check,
    };
  },
};
