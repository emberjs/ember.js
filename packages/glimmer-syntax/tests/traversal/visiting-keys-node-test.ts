import { parse, traverse } from 'glimmer-syntax';

function traversalEqual(node, expectedTraversal) {
  let actualTraversal = [];

  traverse(node, {
    All: {
      enter(node) { actualTraversal.push(['enter', node]); },
      exit(node) { actualTraversal.push(['exit',  node]); },
      keys: {
        All: {
          enter(node, key) { actualTraversal.push([`enter:${key}`, node]); },
          exit(node, key) { actualTraversal.push([`exit:${key}`,  node]); },
        }
      }
    }
  });

  deepEqual(
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

  ok(nodesEqual, "Actual nodes match expected nodes");
}

QUnit.module('[glimmer-syntax] Traversal - visiting keys');

test('Blocks', function() {
  let ast = parse(`{{#block param1 param2 key1=value key2=value}}<b></b><b></b>{{/block}}`);

  traversalEqual(ast, [
    ['enter',            ast],
    ['enter:body',       ast],
    ['enter',            ast.body[0]],
    ['enter:path',       ast.body[0]],
    ['enter',            ast.body[0].path],
    ['exit',             ast.body[0].path],
    ['exit:path',        ast.body[0]],
    ['enter:params',     ast.body[0]],
    ['enter',            ast.body[0].params[0]],
    ['exit',             ast.body[0].params[0]],
    ['enter',            ast.body[0].params[1]],
    ['exit',             ast.body[0].params[1]],
    ['exit:params',      ast.body[0]],
    ['enter:hash',       ast.body[0]],
    ['enter',            ast.body[0].hash],
    ['enter:pairs',      ast.body[0].hash],
    ['enter',            ast.body[0].hash.pairs[0]],
    ['enter:value',      ast.body[0].hash.pairs[0]],
    ['enter',            ast.body[0].hash.pairs[0].value],
    ['exit',             ast.body[0].hash.pairs[0].value],
    ['exit:value',       ast.body[0].hash.pairs[0]],
    ['exit',             ast.body[0].hash.pairs[0]],
    ['enter',            ast.body[0].hash.pairs[1]],
    ['enter:value',      ast.body[0].hash.pairs[1]],
    ['enter',            ast.body[0].hash.pairs[1].value],
    ['exit',             ast.body[0].hash.pairs[1].value],
    ['exit:value',       ast.body[0].hash.pairs[1]],
    ['exit',             ast.body[0].hash.pairs[1]],
    ['exit:pairs',       ast.body[0].hash],
    ['exit',             ast.body[0].hash],
    ['exit:hash',        ast.body[0]],
    ['enter:program',    ast.body[0]],
    ['enter',            ast.body[0].program],
    ['enter:body',       ast.body[0].program],
    ['enter',            ast.body[0].program.body[0]],
    ['enter:attributes', ast.body[0].program.body[0]],
    ['exit:attributes',  ast.body[0].program.body[0]],
    ['enter:modifiers',  ast.body[0].program.body[0]],
    ['exit:modifiers',   ast.body[0].program.body[0]],
    ['enter:children',   ast.body[0].program.body[0]],
    ['exit:children',    ast.body[0].program.body[0]],
    ['exit',             ast.body[0].program.body[0]],
    ['enter',            ast.body[0].program.body[1]],
    ['enter:attributes', ast.body[0].program.body[1]],
    ['exit:attributes',  ast.body[0].program.body[1]],
    ['enter:modifiers',  ast.body[0].program.body[1]],
    ['exit:modifiers',   ast.body[0].program.body[1]],
    ['enter:children',   ast.body[0].program.body[1]],
    ['exit:children',    ast.body[0].program.body[1]],
    ['exit',             ast.body[0].program.body[1]],
    ['exit:body',        ast.body[0].program],
    ['exit',             ast.body[0].program],
    ['exit:program',     ast.body[0]],
    ['exit',             ast.body[0]],
    ['exit:body',        ast],
    ['exit',             ast]
  ]);
});
