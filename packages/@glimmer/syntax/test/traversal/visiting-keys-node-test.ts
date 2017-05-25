import { preprocess as parse, traverse, AST } from "@glimmer/syntax";

function traversalEqual(node: AST.Node, expectedTraversal: Array<[string, AST.Node]>) {
  let actualTraversal: Array<[string, AST.BaseNode]> = [];

  traverse(node, {
    All: {
      enter(node) { actualTraversal.push(['enter', node]); },
      exit(node) { actualTraversal.push(['exit',  node]); },
      keys: {
        All: {
          enter(node: AST.BaseNode, key: string) { actualTraversal.push([`enter:${key}`, node]); },
          exit(node: AST.BaseNode, key: string) { actualTraversal.push([`exit:${key}`,  node]); },
        }
      }
    }
  });

  QUnit.assert.deepEqual(
    actualTraversal.map(a => `${a[0]} ${a[1].type}`),
    expectedTraversal.map(a => `${a[0]} ${a[1].type}`)
  );

  let nodesEqual = true;

  for (let i = 0; i < actualTraversal.length; i++) {
    if (actualTraversal[i][1] !== expectedTraversal[i][1]) {
      nodesEqual = false;
      break;
    }
  }

  QUnit.assert.ok(nodesEqual, "Actual nodes match expected nodes");
}

QUnit.module('[glimmer-syntax] Traversal - visiting keys');

QUnit.test('Blocks', function() {
  let ast = parse(`{{#block param1 param2 key1=value key2=value}}<b></b><b></b>{{/block}}`);
  let block = ast.body[0] as AST.BlockStatement;
  let program = block.program as AST.Program;
  traversalEqual(ast, [
    ['enter',            ast],
    ['enter:body',       ast],
    ['enter',            block],
    ['enter:path',       block],
    ['enter',            block.path],
    ['exit',             block.path],
    ['exit:path',        block],
    ['enter:params',     block],
    ['enter',            block.params[0]],
    ['exit',             block.params[0]],
    ['enter',            block.params[1]],
    ['exit',             block.params[1]],
    ['exit:params',      block],
    ['enter:hash',       block],
    ['enter',            block.hash],
    ['enter:pairs',      block.hash],
    ['enter',            block.hash.pairs[0]],
    ['enter:value',      block.hash.pairs[0]],
    ['enter',            block.hash.pairs[0].value],
    ['exit',             block.hash.pairs[0].value],
    ['exit:value',       block.hash.pairs[0]],
    ['exit',             block.hash.pairs[0]],
    ['enter',            block.hash.pairs[1]],
    ['enter:value',      block.hash.pairs[1]],
    ['enter',            block.hash.pairs[1].value],
    ['exit',             block.hash.pairs[1].value],
    ['exit:value',       block.hash.pairs[1]],
    ['exit',             block.hash.pairs[1]],
    ['exit:pairs',       block.hash],
    ['exit',             block.hash],
    ['exit:hash',        block],
    ['enter:program',    block],
    ['enter',            program],
    ['enter:body',       program],
    ['enter',            program.body[0]],
    ['enter:attributes', program.body[0]],
    ['exit:attributes',  program.body[0]],
    ['enter:modifiers',  program.body[0]],
    ['exit:modifiers',   program.body[0]],
    ['enter:children',   program.body[0]],
    ['exit:children',    program.body[0]],
    ['enter:comments',   program.body[0]],
    ['exit:comments',    program.body[0]],
    ['exit',             program.body[0]],
    ['enter',            program.body[1]],
    ['enter:attributes', program.body[1]],
    ['exit:attributes',  program.body[1]],
    ['enter:modifiers',  program.body[1]],
    ['exit:modifiers',   program.body[1]],
    ['enter:children',   program.body[1]],
    ['exit:children',    program.body[1]],
    ['enter:comments',   program.body[1]],
    ['exit:comments',    program.body[1]],
    ['exit',             program.body[1]],
    ['exit:body',        program],
    ['exit',             program],
    ['exit:program',     block],
    ['exit',             block],
    ['exit:body',        ast],
    ['exit',             ast]
  ]);
});
