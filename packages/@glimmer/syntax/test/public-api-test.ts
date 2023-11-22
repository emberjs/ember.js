import * as syntax from '@glimmer/syntax';

QUnit.module('[glimmer-syntax] Public API is unchanged');

QUnit.test('exports are not accidentally removed', (assert) => {
  assert.ok(syntax.print);
  assert.ok(syntax.sortByLoc);
  assert.ok(syntax.getTemplateLocals);
  assert.ok(syntax.isKeyword);
  assert.ok(syntax.KEYWORDS_TYPES);
  assert.ok(syntax.src);
  assert.ok(syntax.preprocess);
  assert.ok(syntax.hasSpan);
  assert.ok(syntax.loc);
  assert.ok(syntax.maybeLoc);
  assert.ok(syntax.SpanList);
  assert.ok(syntax.BlockSymbolTable);
  assert.ok(syntax.ProgramSymbolTable);
  assert.ok(syntax.SymbolTable);
  assert.ok(syntax.generateSyntaxError);
  assert.ok(syntax.cannotRemoveNode);
  assert.ok(syntax.cannotReplaceNode);
  assert.ok(syntax.WalkerPath);
  assert.ok(syntax.traverse);
  assert.ok(syntax.Walker);
  assert.ok(syntax.ASTv1);
  assert.ok(syntax.builders);
  assert.ok(syntax.visitorKeys);
  assert.ok(syntax.getVoidTags);
  assert.ok(syntax.isVoidTag);
  assert.ok(syntax.ASTv2);
  assert.ok(syntax.normalize);
  assert.ok(syntax.node);
  // deprecated
  assert.ok(syntax.Path);
  // deprecated
  assert.ok(syntax.AST);
});
