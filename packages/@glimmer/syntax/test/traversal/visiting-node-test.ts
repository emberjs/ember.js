import type { Optional, OptionalArray } from '@glimmer/interfaces';
import type { AST, WalkerPath } from '@glimmer/syntax';
import { preprocess as parse, traverse } from '@glimmer/syntax';

const { test } = QUnit;

function traversalEqual(
  node: AST.Node,
  expectedTraversal: Array<[string, AST.BaseNode | undefined]>
) {
  let actualTraversal: Array<[string, AST.BaseNode]> = [];

  traverse(node, {
    All: {
      enter(node) {
        actualTraversal.push(['enter', node]);
      },
      exit(node) {
        actualTraversal.push(['exit', node]);
      },
    },
  });

  QUnit.assert.deepEqual(
    actualTraversal.map((a) => `${a[0]} ${a[1].type}`),
    expectedTraversal.map((a) => `${a[0]} ${a[1]?.type}`)
  );

  let nodesEqual = true;

  for (let i = 0; i < actualTraversal.length; i++) {
    if (actualTraversal[i]?.[1] !== expectedTraversal[i]?.[1]) {
      nodesEqual = false;
      break;
    }
  }

  QUnit.assert.ok(nodesEqual, 'Actual nodes match expected nodes');
}

QUnit.module('[glimmer-syntax] Traversal - visiting');

test('Elements and attributes', () => {
  let ast = parse(
    `<div id="id" class="large {{this.classes}}" value={{this.value}}><b></b><b></b></div>`
  );
  let el = ast.body[0] as AST.ElementNode;
  let concat = el.attributes[1]?.value;
  let concatMustache = getParts(concat)?.[1];
  let attrMustache = el.attributes[2]?.value;
  traversalEqual(ast, [
    ['enter', ast],
    ['enter', el],
    ['enter', el.attributes[0]],
    ['enter', el.attributes[0]?.value],
    ['exit', el.attributes[0]?.value],
    ['exit', el.attributes[0]],
    ['enter', el.attributes[1]],
    ['enter', concat],
    ['enter', getFirstPart(concat)],
    ['exit', getFirstPart(concat)],
    ['enter', concatMustache],
    ['enter', getPath(concatMustache)],
    ['exit', getPath(concatMustache)],
    ['enter', getHash(concatMustache)],
    ['exit', getHash(concatMustache)],
    ['exit', concatMustache],
    ['exit', concat],
    ['exit', el.attributes[1]],
    ['enter', el.attributes[2]],
    ['enter', attrMustache],
    ['enter', getPath(attrMustache)],
    ['exit', getPath(attrMustache)],
    ['enter', getHash(attrMustache)],
    ['exit', getHash(attrMustache)],
    ['exit', attrMustache],
    ['exit', el.attributes[2]],
    ['enter', el.children[0]],
    ['exit', el.children[0]],
    ['enter', el.children[1]],
    ['exit', el.children[1]],
    ['exit', el],
    ['exit', ast],
  ]);
});

test('Element modifiers', () => {
  let ast = parse(`<div {{modifier}}{{modifier param1 param2 key1=value key2=value}}></div>`);
  let el = ast.body[0] as AST.ElementNode;
  traversalEqual(ast, [
    ['enter', ast],
    ['enter', el],
    ['enter', el.modifiers[0]],
    ['enter', el.modifiers[0]?.path],
    ['exit', el.modifiers[0]?.path],
    ['enter', el.modifiers[0]?.hash],
    ['exit', el.modifiers[0]?.hash],
    ['exit', el.modifiers[0]],
    ['enter', el.modifiers[1]],
    ['enter', el.modifiers[1]?.path],
    ['exit', el.modifiers[1]?.path],
    ['enter', el.modifiers[1]?.params[0]],
    ['exit', el.modifiers[1]?.params[0]],
    ['enter', el.modifiers[1]?.params[1]],
    ['exit', el.modifiers[1]?.params[1]],
    ['enter', el.modifiers[1]?.hash],
    ['enter', el.modifiers[1]?.hash.pairs[0]],
    ['enter', el.modifiers[1]?.hash.pairs[0]?.value],
    ['exit', el.modifiers[1]?.hash.pairs[0]?.value],
    ['exit', el.modifiers[1]?.hash.pairs[0]],
    ['enter', el.modifiers[1]?.hash.pairs[1]],
    ['enter', el.modifiers[1]?.hash.pairs[1]?.value],
    ['exit', el.modifiers[1]?.hash.pairs[1]?.value],
    ['exit', el.modifiers[1]?.hash.pairs[1]],
    ['exit', el.modifiers[1]?.hash],
    ['exit', el.modifiers[1]],
    ['exit', el],
    ['exit', ast],
  ]);
});

test('Blocks', () => {
  let ast = parse(
    `{{#block}}{{/block}}` +
      `{{#block param1 param2 key1=value key2=value}}<b></b><b></b>{{/block}}`
  );

  let block1 = ast.body[0] as AST.BlockStatement;
  let block2 = ast.body[1] as AST.BlockStatement;

  traversalEqual(ast, [
    ['enter', ast],
    ['enter', block1],
    ['enter', block1.path],
    ['exit', block1.path],
    ['enter', block1.hash],
    ['exit', block1.hash],
    ['enter', block1.program],
    ['exit', block1.program],
    ['exit', block1],
    ['enter', block2],
    ['enter', block2.path],
    ['exit', block2.path],
    ['enter', block2.params[0]],
    ['exit', block2.params[0]],
    ['enter', block2.params[1]],
    ['exit', block2.params[1]],
    ['enter', block2.hash],
    ['enter', block2.hash.pairs[0]],
    ['enter', block2.hash.pairs[0]?.value],
    ['exit', block2.hash.pairs[0]?.value],
    ['exit', block2.hash.pairs[0]],
    ['enter', block2.hash.pairs[1]],
    ['enter', block2.hash.pairs[1]?.value],
    ['exit', block2.hash.pairs[1]?.value],
    ['exit', block2.hash.pairs[1]],
    ['exit', block2.hash],
    ['enter', block2.program],
    ['enter', block2.program.body[0]],
    ['exit', block2.program.body[0]],
    ['enter', block2.program.body[1]],
    ['exit', block2.program.body[1]],
    ['exit', block2.program],
    ['exit', block2],
    ['exit', ast],
  ]);
});

test('Mustaches', () => {
  let ast = parse(`{{mustache}}` + `{{mustache param1 param2 key1=value key2=value}}`);

  let must1 = ast.body[0] as AST.MustacheStatement;
  let must2 = ast.body[1] as AST.MustacheStatement;

  traversalEqual(ast, [
    ['enter', ast],
    ['enter', must1],
    ['enter', must1.path],
    ['exit', must1.path],
    ['enter', must1.hash],
    ['exit', must1.hash],
    ['exit', must1],
    ['enter', must2],
    ['enter', must2.path],
    ['exit', must2.path],
    ['enter', must2.params[0]],
    ['exit', must2.params[0]],
    ['enter', must2.params[1]],
    ['exit', must2.params[1]],
    ['enter', must2.hash],
    ['enter', must2.hash.pairs[0]],
    ['enter', must2.hash.pairs[0]?.value],
    ['exit', must2.hash.pairs[0]?.value],
    ['exit', must2.hash.pairs[0]],
    ['enter', must2.hash.pairs[1]],
    ['enter', must2.hash.pairs[1]?.value],
    ['exit', must2.hash.pairs[1]?.value],
    ['exit', must2.hash.pairs[1]],
    ['exit', must2.hash],
    ['exit', must2],
    ['exit', ast],
  ]);
});

test('Nested helpers', () => {
  let ast = parse(`{{helper
    (helper param1 param2 key1=value key2=value)
    key1=(helper param)
    key2=(helper key=(helper param))
  }}`);

  let must = ast.body[0] as AST.MustacheStatement;
  let sexp = must.params[0] as AST.SubExpression;
  let nestedSexp1 = must.hash.pairs[0]?.value;
  let nestedSexp2 = must.hash.pairs[1]?.value;
  let deeplyNestedSexp = getHash(nestedSexp2)?.pairs[0]?.value;
  traversalEqual(ast, [
    ['enter', ast],
    ['enter', must],
    ['enter', must.path],
    ['exit', must.path],
    ['enter', sexp],
    ['enter', sexp.path],
    ['exit', sexp.path],
    ['enter', sexp.params[0]],
    ['exit', sexp.params[0]],
    ['enter', sexp.params[1]],
    ['exit', sexp.params[1]],
    ['enter', sexp.hash],
    ['enter', sexp.hash.pairs[0]],
    ['enter', sexp.hash.pairs[0]?.value],
    ['exit', sexp.hash.pairs[0]?.value],
    ['exit', sexp.hash.pairs[0]],
    ['enter', sexp.hash.pairs[1]],
    ['enter', sexp.hash.pairs[1]?.value],
    ['exit', sexp.hash.pairs[1]?.value],
    ['exit', sexp.hash.pairs[1]],
    ['exit', sexp.hash],
    ['exit', sexp],
    ['enter', must.hash],
    ['enter', must.hash.pairs[0]],
    ['enter', nestedSexp1],
    ['enter', getPath(nestedSexp1)],
    ['exit', getPath(nestedSexp1)],
    ['enter', getParams(nestedSexp1)?.[0]],
    ['exit', getParams(nestedSexp1)?.[0]],
    ['enter', getHash(nestedSexp1)],
    ['exit', getHash(nestedSexp1)],
    ['exit', nestedSexp1],
    ['exit', must.hash.pairs[0]],
    ['enter', must.hash.pairs[1]],
    ['enter', nestedSexp2],
    ['enter', getPath(nestedSexp2)],
    ['exit', getPath(nestedSexp2)],
    ['enter', getHash(nestedSexp2)],
    ['enter', getHash(nestedSexp2)?.pairs[0]],
    ['enter', deeplyNestedSexp],
    ['enter', getPath(deeplyNestedSexp)],
    ['exit', getPath(deeplyNestedSexp)],
    ['enter', getParams(deeplyNestedSexp)?.[0]],
    ['exit', getParams(deeplyNestedSexp)?.[0]],
    ['enter', getHash(deeplyNestedSexp)],
    ['exit', getHash(deeplyNestedSexp)],
    ['exit', deeplyNestedSexp],
    ['exit', getHash(nestedSexp2)?.pairs[0]],
    ['exit', getHash(nestedSexp2)],
    ['exit', nestedSexp2],
    ['exit', must.hash.pairs[1]],
    ['exit', must.hash],
    ['exit', must],
    ['exit', ast],
  ]);
});

test('Comments', () => {
  let ast = parse(
    `<!-- HTML comment -->{{!-- Handlebars comment --}}<div {{! Other Comment }}></div>`
  );
  let el = ast.body[2] as AST.ElementNode;
  traversalEqual(ast, [
    ['enter', ast],
    ['enter', ast.body[0]],
    ['exit', ast.body[0]],
    ['enter', ast.body[1]],
    ['exit', ast.body[1]],
    ['enter', el],
    ['enter', el.comments[0]],
    ['exit', el.comments[0]],
    ['exit', el],
    ['exit', ast],
  ]);
});

QUnit.module('[glimmer-syntax] Traversal - visiting - paths');

test('Basics', (assert) => {
  let ast = parse(`{{#if foo}}<div>bar</div>{{/if}}`);

  traverse(ast, {
    TextNode(node, path) {
      assert.step('TextNode');
      assert.strictEqual(node.chars, 'bar');
      assert.strictEqual(path.node, node);
      assert.deepEqual(describeFullPath(path), [
        { nodeType: 'Template', key: 'body' },
        { nodeType: 'BlockStatement', key: 'program' },
        { nodeType: 'Block', key: 'body' },
        { nodeType: 'ElementNode', key: 'children' },
        { nodeType: 'TextNode', key: null },
      ]);
    },
  });

  assert.verifySteps(['TextNode']);
});

test('Helper', (assert) => {
  let ast = parse(`{{#foo (bar this.blah)}}{{/foo}}`);

  traverse(ast, {
    PathExpression(node, path) {
      if (node.original === 'this.blah') {
        assert.step('PathExpression this.blah');
        assert.deepEqual(describeFullPath(path), [
          { nodeType: 'Template', key: 'body' },
          { nodeType: 'BlockStatement', key: 'params' },
          { nodeType: 'SubExpression', key: 'params' },
          { nodeType: 'PathExpression', key: null },
        ]);

        assert.notEqual((path.parent!.node as AST.SubExpression).params.indexOf(node), -1);
      }
    },
  });

  assert.verifySteps(['PathExpression this.blah']);
});

test('Modifier', (assert) => {
  let ast = parse(`<div {{foo}}></div>`);

  traverse(ast, {
    PathExpression(node, path) {
      if (node.original === 'foo') {
        assert.step('PathExpression foo');

        assert.deepEqual(describeFullPath(path), [
          { nodeType: 'Template', key: 'body' },
          { nodeType: 'ElementNode', key: 'modifiers' },
          { nodeType: 'ElementModifierStatement', key: 'path' },
          { nodeType: 'PathExpression', key: null },
        ]);

        assert.deepEqual(
          Array.from(path.parents()).map((it) => (it as WalkerPath<AST.Node>).node.type),
          ['ElementModifierStatement', 'ElementNode', 'Template']
        );

        assert.strictEqual((path.parent!.node as AST.ElementModifierStatement).path, node);
      }
    },
  });

  assert.verifySteps(['PathExpression foo']);
});

function describeFullPath(
  path: WalkerPath<AST.Node>
): Array<{ nodeType: string; key: string | null }> {
  let description = [];
  description.push({ nodeType: path.node.type, key: null });

  while (path.parent) {
    description.unshift({ nodeType: path.parent.node.type, key: path.parentKey });
    path = path.parent;
  }

  return description;
}

function getFirstPart(value: AST.AttrValue | undefined): Optional<AST.AttrPart> {
  let parts = getParts(value);

  if (parts === undefined) return undefined;

  return parts[0];
}

function getParts(value: AST.AttrValue | undefined): OptionalArray<AST.AttrPart> {
  if (value === undefined) return undefined;

  switch (value.type) {
    case 'ConcatStatement':
      return value.parts;
    case 'MustacheStatement':
    case 'TextNode':
      return [value];
  }
}

function getPath(part: Optional<AST.Expression | AST.AttrValue>): Optional<AST.Expression> {
  if (part === undefined) return undefined;

  if ('path' in part) {
    return part.path;
  }
}

function getParams(part: Optional<AST.Expression | AST.AttrValue>): Optional<AST.Expression[]> {
  if (part === undefined) return undefined;

  if ('params' in part) {
    return part.params;
  }
}

function getHash(part: Optional<AST.Expression | AST.AttrValue>): Optional<AST.Hash> {
  if (part === undefined) return undefined;

  if ('hash' in part) {
    return part.hash;
  }
}
