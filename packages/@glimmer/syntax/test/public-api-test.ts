import * as syntax from '@glimmer/syntax';

QUnit.module('[glimmer-syntax] Public API is unchanged');

type SyntaxExportName = keyof typeof syntax;

const EXPECTED_EXPORTS = [
  'print',
  'sortByLoc',
  'getTemplateLocals',
  'isKeyword',
  'KEYWORDS_TYPES',
  'src',
  'preprocess',
  'hasSpan',
  'loc',
  'maybeLoc',
  'SpanList',
  'BlockSymbolTable',
  'ProgramSymbolTable',
  'SymbolTable',
  'generateSyntaxError',
  'cannotRemoveNode',
  'cannotReplaceNode',
  'WalkerPath',
  'traverse',
  'Walker',
  'builders',
  'visitorKeys',
  'getVoidTags',
  'isVoidTag',
  'ASTv2',
  'normalize',
  'node',
  'Path',
] as const satisfies SyntaxExportName[];

QUnit.test('exports are not accidentally removed', (assert) => {
  for (const key of EXPECTED_EXPORTS) {
    if (Reflect.has(syntax, key)) {
      assert.ok(Reflect.get(syntax, key), `Expected truthy export: ${key}`);
    } else {
      assert.true(Reflect.has(syntax, key), `Expected export: ${key}`);
    }
  }
});
