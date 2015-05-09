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

test("blocks", function() {
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

