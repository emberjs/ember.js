import { parse, traverse } from 'glimmer-syntax';

function traversalEqual(node, expectedTraversal) {
  let actualTraversal = [];

  traverse(node, {
    All: {
      enter(node) { actualTraversal.push(['enter', node]); },
      exit(node) { actualTraversal.push(['exit',  node]); }
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

QUnit.module('[glimmer-syntax] Traversal - visiting');

test('Elements and attributes', function() {
  let ast = parse(`<div id="id" class="large {{classes}}" value={{value}}><b></b><b></b></div>`);

  traversalEqual(ast, [
    ['enter', ast],
    ['enter', ast.body[0]],
    ['enter', ast.body[0].attributes[0]],
    ['enter', ast.body[0].attributes[0].value],
    ['exit',  ast.body[0].attributes[0].value],
    ['exit',  ast.body[0].attributes[0]],
    ['enter', ast.body[0].attributes[1]],
    ['enter', ast.body[0].attributes[1].value],
    ['enter', ast.body[0].attributes[1].value.parts[0]],
    ['exit',  ast.body[0].attributes[1].value.parts[0]],
    ['enter', ast.body[0].attributes[1].value.parts[1]],
    ['enter', ast.body[0].attributes[1].value.parts[1].path],
    ['exit',  ast.body[0].attributes[1].value.parts[1].path],
    ['enter', ast.body[0].attributes[1].value.parts[1].hash],
    ['exit',  ast.body[0].attributes[1].value.parts[1].hash],
    ['exit',  ast.body[0].attributes[1].value.parts[1]],
    ['exit',  ast.body[0].attributes[1].value],
    ['exit',  ast.body[0].attributes[1]],
    ['enter', ast.body[0].attributes[2]],
    ['enter', ast.body[0].attributes[2].value],
    ['enter', ast.body[0].attributes[2].value.path],
    ['exit',  ast.body[0].attributes[2].value.path],
    ['enter', ast.body[0].attributes[2].value.hash],
    ['exit',  ast.body[0].attributes[2].value.hash],
    ['exit',  ast.body[0].attributes[2].value],
    ['exit',  ast.body[0].attributes[2]],
    ['enter', ast.body[0].children[0]],
    ['exit',  ast.body[0].children[0]],
    ['enter', ast.body[0].children[1]],
    ['exit',  ast.body[0].children[1]],
    ['exit',  ast.body[0]],
    ['exit',  ast]
  ]);
});

test('Element modifiers', function() {
  let ast = parse(`<div {{modifier}}{{modifier param1 param2 key1=value key2=value}}></div>`);

  traversalEqual(ast, [
    ['enter', ast],
    ['enter', ast.body[0]],
    ['enter', ast.body[0].modifiers[0]],
    ['enter', ast.body[0].modifiers[0].path],
    ['exit',  ast.body[0].modifiers[0].path],
    ['enter', ast.body[0].modifiers[0].hash],
    ['exit',  ast.body[0].modifiers[0].hash],
    ['exit',  ast.body[0].modifiers[0]],
    ['enter', ast.body[0].modifiers[1]],
    ['enter', ast.body[0].modifiers[1].path],
    ['exit',  ast.body[0].modifiers[1].path],
    ['enter', ast.body[0].modifiers[1].params[0]],
    ['exit',  ast.body[0].modifiers[1].params[0]],
    ['enter', ast.body[0].modifiers[1].params[1]],
    ['exit',  ast.body[0].modifiers[1].params[1]],
    ['enter', ast.body[0].modifiers[1].hash],
    ['enter', ast.body[0].modifiers[1].hash.pairs[0]],
    ['enter', ast.body[0].modifiers[1].hash.pairs[0].value],
    ['exit',  ast.body[0].modifiers[1].hash.pairs[0].value],
    ['exit' , ast.body[0].modifiers[1].hash.pairs[0]],
    ['enter', ast.body[0].modifiers[1].hash.pairs[1]],
    ['enter', ast.body[0].modifiers[1].hash.pairs[1].value],
    ['exit',  ast.body[0].modifiers[1].hash.pairs[1].value],
    ['exit' , ast.body[0].modifiers[1].hash.pairs[1]],
    ['exit',  ast.body[0].modifiers[1].hash],
    ['exit',  ast.body[0].modifiers[1]],
    ['exit',  ast.body[0]],
    ['exit',  ast]
  ]);
});

test('Blocks', function() {
  let ast = parse(
    `{{#block}}{{/block}}` +
    `{{#block param1 param2 key1=value key2=value}}<b></b><b></b>{{/block}}`
  );

  traversalEqual(ast, [
    ['enter', ast],
    ['enter', ast.body[0]],
    ['enter', ast.body[0].path],
    ['exit',  ast.body[0].path],
    ['enter', ast.body[0].hash],
    ['exit',  ast.body[0].hash],
    ['enter', ast.body[0].program],
    ['exit',  ast.body[0].program],
    ['exit',  ast.body[0]],
    ['enter', ast.body[1]],
    ['enter', ast.body[1].path],
    ['exit',  ast.body[1].path],
    ['enter', ast.body[1].params[0]],
    ['exit',  ast.body[1].params[0]],
    ['enter', ast.body[1].params[1]],
    ['exit',  ast.body[1].params[1]],
    ['enter', ast.body[1].hash],
    ['enter', ast.body[1].hash.pairs[0]],
    ['enter', ast.body[1].hash.pairs[0].value],
    ['exit',  ast.body[1].hash.pairs[0].value],
    ['exit',  ast.body[1].hash.pairs[0]],
    ['enter', ast.body[1].hash.pairs[1]],
    ['enter', ast.body[1].hash.pairs[1].value],
    ['exit',  ast.body[1].hash.pairs[1].value],
    ['exit',  ast.body[1].hash.pairs[1]],
    ['exit',  ast.body[1].hash],
    ['enter', ast.body[1].program],
    ['enter', ast.body[1].program.body[0]],
    ['exit',  ast.body[1].program.body[0]],
    ['enter', ast.body[1].program.body[1]],
    ['exit',  ast.body[1].program.body[1]],
    ['exit',  ast.body[1].program],
    ['exit',  ast.body[1]],
    ['exit',  ast]
  ]);
});

test('Mustaches', function() {
  let ast = parse(
    `{{mustache}}` +
    `{{mustache param1 param2 key1=value key2=value}}`
  );

  traversalEqual(ast, [
    ['enter', ast],
    ['enter', ast.body[0]],
    ['enter', ast.body[0].path],
    ['exit',  ast.body[0].path],
    ['enter', ast.body[0].hash],
    ['exit',  ast.body[0].hash],
    ['exit',  ast.body[0]],
    ['enter', ast.body[1]],
    ['enter', ast.body[1].path],
    ['exit',  ast.body[1].path],
    ['enter', ast.body[1].params[0]],
    ['exit',  ast.body[1].params[0]],
    ['enter', ast.body[1].params[1]],
    ['exit',  ast.body[1].params[1]],
    ['enter', ast.body[1].hash],
    ['enter', ast.body[1].hash.pairs[0]],
    ['enter', ast.body[1].hash.pairs[0].value],
    ['exit',  ast.body[1].hash.pairs[0].value],
    ['exit',  ast.body[1].hash.pairs[0]],
    ['enter', ast.body[1].hash.pairs[1]],
    ['enter', ast.body[1].hash.pairs[1].value],
    ['exit',  ast.body[1].hash.pairs[1].value],
    ['exit',  ast.body[1].hash.pairs[1]],
    ['exit',  ast.body[1].hash],
    ['exit',  ast.body[1]],
    ['exit',  ast]
  ]);
});

test('Nested helpers', function() {
  let ast = parse(`{{helper
    (helper param1 param2 key1=value key2=value)
    key1=(helper param)
    key2=(helper key=(helper param))
  }}`);

  traversalEqual(ast, [
    ['enter', ast],
    ['enter', ast.body[0]],
    ['enter', ast.body[0].path],
    ['exit',  ast.body[0].path],
    ['enter', ast.body[0].params[0]],
    ['enter', ast.body[0].params[0].path],
    ['exit',  ast.body[0].params[0].path],
    ['enter', ast.body[0].params[0].params[0]],
    ['exit',  ast.body[0].params[0].params[0]],
    ['enter', ast.body[0].params[0].params[1]],
    ['exit',  ast.body[0].params[0].params[1]],
    ['enter', ast.body[0].params[0].hash],
    ['enter', ast.body[0].params[0].hash.pairs[0]],
    ['enter', ast.body[0].params[0].hash.pairs[0].value],
    ['exit',  ast.body[0].params[0].hash.pairs[0].value],
    ['exit',  ast.body[0].params[0].hash.pairs[0]],
    ['enter', ast.body[0].params[0].hash.pairs[1]],
    ['enter', ast.body[0].params[0].hash.pairs[1].value],
    ['exit',  ast.body[0].params[0].hash.pairs[1].value],
    ['exit',  ast.body[0].params[0].hash.pairs[1]],
    ['exit',  ast.body[0].params[0].hash],
    ['exit',  ast.body[0].params[0]],
    ['enter', ast.body[0].hash],
    ['enter', ast.body[0].hash.pairs[0]],
    ['enter', ast.body[0].hash.pairs[0].value],
    ['enter', ast.body[0].hash.pairs[0].value.path],
    ['exit',  ast.body[0].hash.pairs[0].value.path],
    ['enter', ast.body[0].hash.pairs[0].value.params[0]],
    ['exit',  ast.body[0].hash.pairs[0].value.params[0]],
    ['enter', ast.body[0].hash.pairs[0].value.hash],
    ['exit',  ast.body[0].hash.pairs[0].value.hash],
    ['exit',  ast.body[0].hash.pairs[0].value],
    ['exit',  ast.body[0].hash.pairs[0]],
    ['enter', ast.body[0].hash.pairs[1]],
    ['enter', ast.body[0].hash.pairs[1].value],
    ['enter', ast.body[0].hash.pairs[1].value.path],
    ['exit',  ast.body[0].hash.pairs[1].value.path],
    ['enter', ast.body[0].hash.pairs[1].value.hash],
    ['enter', ast.body[0].hash.pairs[1].value.hash.pairs[0]],
    ['enter', ast.body[0].hash.pairs[1].value.hash.pairs[0].value],
    ['enter', ast.body[0].hash.pairs[1].value.hash.pairs[0].value.path],
    ['exit',  ast.body[0].hash.pairs[1].value.hash.pairs[0].value.path],
    ['enter', ast.body[0].hash.pairs[1].value.hash.pairs[0].value.params[0]],
    ['exit',  ast.body[0].hash.pairs[1].value.hash.pairs[0].value.params[0]],
    ['enter', ast.body[0].hash.pairs[1].value.hash.pairs[0].value.hash],
    ['exit',  ast.body[0].hash.pairs[1].value.hash.pairs[0].value.hash],
    ['exit',  ast.body[0].hash.pairs[1].value.hash.pairs[0].value],
    ['exit',  ast.body[0].hash.pairs[1].value.hash.pairs[0]],
    ['exit',  ast.body[0].hash.pairs[1].value.hash],
    ['exit',  ast.body[0].hash.pairs[1].value],
    ['exit',  ast.body[0].hash.pairs[1]],
    ['exit',  ast.body[0].hash],
    ['exit',  ast.body[0]],
    ['exit',  ast]
  ]);
});

test('Comments', function() {
  let ast = parse(`<!-- HTML comment -->{{!-- Handlebars comment --}}`);

  traversalEqual(ast, [
    ['enter', ast],
    ['enter', ast.body[0]],
    ['exit',  ast.body[0]],
    // TODO: Ensure Handlebars comments are in the AST.
    // ['enter', ast.body[1]],
    // ['exit',  ast.body[1]],
    ['exit',  ast]
  ]);
});
