/**
 * These snapshot tests track how "tree-shakable" ember-source is. Ideally, over
 * time, fewer and fewer files appear in these lists.
 *
 * Rather than inspecting the published (chunked) build, we re-run our own rollup
 * config with `preserveModules: true` so that every source module maps to a
 * single output file with an unmangled name. The side-effect probe (see
 * ./lib/detect.js) then attributes each surviving side-effect to the specific
 * source file that caused it, instead of to a shared chunk.
 */
import { beforeAll, it, expect } from 'vitest';
import { findSideEffectfulModules } from './lib/build.js';

let modules;

beforeAll(() => {
  modules = findSideEffectfulModules();
}, 120_000);

it('[dev] source modules with side effects', () => {
  expect(modules.dev).toMatchInlineSnapshot(`
    [
      "@ember/-internals/environment/lib/env.js",
      "@ember/-internals/glimmer/lib/components/input.js",
      "@ember/-internals/glimmer/lib/components/link-to.js",
      "@ember/-internals/glimmer/lib/environment.js",
      "@ember/-internals/glimmer/lib/renderer.js",
      "@ember/-internals/runtime/lib/ext/rsvp.js",
      "@ember/debug/index.js",
      "@glimmer/runtime/lib/compiled/opcodes/component.js",
      "@glimmer/runtime/lib/compiled/opcodes/content.js",
      "@glimmer/runtime/lib/compiled/opcodes/debugger.js",
      "@glimmer/runtime/lib/compiled/opcodes/dom.js",
      "@glimmer/runtime/lib/compiled/opcodes/expressions.js",
      "@glimmer/runtime/lib/compiled/opcodes/lists.js",
      "@glimmer/runtime/lib/compiled/opcodes/vm.js",
      "@glimmer/validator/index.js",
      "@handlebars/parser/lib/parse.js",
      "@handlebars/parser/lib/printer.js",
      "@handlebars/parser/lib/whitespace-control.js",
      "ember-testing/index.js",
      "rsvp/index.js",
    ]
  `);
});

it('[prod] source modules with side effects', () => {
  expect(modules.prod).toMatchInlineSnapshot(`
    [
      "@ember/-internals/environment/lib/env.js",
      "@ember/-internals/glimmer/lib/components/input.js",
      "@ember/-internals/glimmer/lib/environment.js",
      "@ember/-internals/glimmer/lib/renderer.js",
      "@ember/-internals/runtime/lib/ext/rsvp.js",
      "@glimmer/runtime/lib/compiled/opcodes/component.js",
      "@glimmer/runtime/lib/compiled/opcodes/content.js",
      "@glimmer/runtime/lib/compiled/opcodes/debugger.js",
      "@glimmer/runtime/lib/compiled/opcodes/dom.js",
      "@glimmer/runtime/lib/compiled/opcodes/expressions.js",
      "@glimmer/runtime/lib/compiled/opcodes/lists.js",
      "@glimmer/runtime/lib/compiled/opcodes/vm.js",
      "@glimmer/validator/index.js",
      "@handlebars/parser/lib/parse.js",
      "@handlebars/parser/lib/printer.js",
      "@handlebars/parser/lib/whitespace-control.js",
      "ember-testing/index.js",
      "rsvp/index.js",
    ]
  `);
});
