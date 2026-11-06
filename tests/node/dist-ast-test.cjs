'use strict';

// The classic-dist guard of scripts/bundle-size-check.mjs: the live gxt-bridge
// calls of a dist file, read from its AST (scripts/dist-ast.mjs
// `liveGxtBridgeCalls`).

QUnit.module('the live gxt-bridge calls of a classic dist file', function (hooks) {
  let liveGxtBridgeCalls;

  hooks.before(async function () {
    ({ liveGxtBridgeCalls } = await import('../../scripts/dist-ast.mjs'));
  });

  QUnit.test('a file that only names the bridge has none', function (assert) {
    let code = [
      '/**',
      ' * In GXT builds the renderer reads `getGxtRenderer()?.compilePipeline`, and',
      ' * compile.ts calls `installCompilePipelinePart(…)`.',
      ' */',
      'function getGxtRenderer() {',
      '  return null;',
      '}',
      'function getGxtGlimmerHost() {',
      '  return null;',
      '}',
      'export { getGxtRenderer, getGxtGlimmerHost };',
    ].join('\n');

    assert.deepEqual(liveGxtBridgeCalls(code, 'clean.js'), []);
  });

  QUnit.test('a commented-out call is none', function (assert) {
    let code = [
      '// installRuntimePart({ render });',
      '/* setGxtRenderer(renderer); */',
      'export function render() {',
      '  // getGxtRenderer()?.compilePipeline.cellFor(obj, key);',
      '  return null;',
      '}',
    ].join('\n');

    assert.deepEqual(liveGxtBridgeCalls(code, 'commented-out.js'), []);
  });

  QUnit.test('a string that reads like a call is none', function (assert) {
    let code = "export const message = 'installRuntimePart( runs in GXT builds only';";

    assert.deepEqual(liveGxtBridgeCalls(code, 'string.js'), []);
  });

  QUnit.test('a call after a string that opens a block comment is found', function (assert) {
    let code = [
      'const open = "/*";',
      'installCompilePipelinePart({ cellFor });',
      'const close = "*/";',
      'export { open, close };',
    ].join('\n');

    assert.deepEqual(liveGxtBridgeCalls(code, 'hidden-block.js'), ['installCompilePipelinePart()']);
  });

  QUnit.test('a read after a string that opens a line comment is found', function (assert) {
    let code = [
      'export function cell(obj, key) {',
      '  const path = "a//b"; return getGxtRenderer()?.compilePipeline.cellFor(obj, key);',
      '}',
    ].join('\n');

    assert.deepEqual(liveGxtBridgeCalls(code, 'hidden-line.js'), ['getGxtRenderer().']);
  });

  QUnit.test('a call through a member or an optional call is found', function (assert) {
    let code = [
      'bridge.setGxtRenderer(renderer);',
      'installRuntimePart?.({ render });',
      'const host = getGxtGlimmerHost();',
    ].join('\n');

    assert.deepEqual(liveGxtBridgeCalls(code, 'calls.js'), [
      'setGxtRenderer()',
      'installRuntimePart()',
      'getGxtGlimmerHost()',
    ]);
  });
});
