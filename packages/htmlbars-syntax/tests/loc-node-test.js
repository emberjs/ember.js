import { parse } from "../htmlbars-syntax";

QUnit.module("Parser - Location Info");

function locEqual(node, startLine, startColumn, endLine, endColumn, message) {

  var expected = {
    source: null,
    start: { line: startLine, column: startColumn },
    end: { line: endLine, column: endColumn }
  };

  deepEqual(node.loc, expected, message);
}

test("programs", function() {
  var ast = parse(`
  {{#if foo}}
    {{bar}}
       {{/if}}
    `);

  locEqual(ast, 1, 0, 5, 4, 'outer program');

  // startColumn should be 13 not 2.
  // This should be fixed upstream in Handlebars.
  locEqual(ast.body[1].program, 2, 2, 4, 7, 'nested program');
});

test("blocks", function() {
  var ast = parse(`
  {{#if foo}}
    {{#if bar}}
        test
        {{else}}
      test
  {{/if    }}
       {{/if
      }}
    `);

  locEqual(ast.body[1], 2, 2, 9, 8, 'outer block');
  locEqual(ast.body[1].program.body[0], 3, 4, 7, 13, 'nested block');
});

test("mustache", function() {
  var ast = parse(`
    {{foo}}
    {{#if foo}}
      bar: {{bar
        }}
    {{/if}}
  `);

  locEqual(ast.body[1], 2, 4, 2, 11, 'outer mustache');
  locEqual(ast.body[3].program.body[1], 4, 11, 5, 10, 'inner mustache');
});

test("element modifier", function() {
  var ast = parse(`
    <div {{bind-attr
      foo
      bar=wat}}></div>
  `);

  locEqual(ast.body[1].modifiers[0], 2, 9, 4, 15, 'element modifier');
});
