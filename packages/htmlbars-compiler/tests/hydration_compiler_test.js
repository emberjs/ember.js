import { HydrationOpcodeCompiler } from "../htmlbars-compiler/compiler/hydration_opcode";
import { preprocess } from "../htmlbars-compiler/parser";

function opcodesFor(html, options) {
  var ast = preprocess(html, options),
      compiler1 = new HydrationOpcodeCompiler(options);
  compiler1.compile(ast);
  return compiler1.opcodes;
}

QUnit.module("HydrationOpcodeCompiler opcode generation");

test("simple example", function() {
  var opcodes = opcodesFor("<div>{{foo}} bar {{baz}}</div>");
  deepEqual(opcodes, [
    [ "morph", [ 0, [ 0 ], -1, 0, true ] ],
    [ "morph", [ 1, [ 0 ], 0, -1, true ] ],
    [ "id", [ [ "foo" ] ] ],
    [ "ambiguous", [ 0 ] ],
    [ "id", [ [ "baz" ] ] ],
    [ "ambiguous", [ 1 ] ],
  ]);
});

test("simple block", function() {
  var opcodes = opcodesFor("<div>{{#foo}}{{/foo}}</div>");
  deepEqual(opcodes, [
    [ "morph", [ 0, [ 0 ], null, null, true ] ],
    [ "program", [ 0, null ] ],
    [ "id", [ [ "foo" ] ] ],
    [ "stackLiteral", [ 0 ] ],
    [ "helper", [ 0, 0 ] ]
  ]);
});

test("element with a sole mustache child", function() {
  var opcodes = opcodesFor("<div>{{foo}}</div>");
  deepEqual(opcodes, [
    [ "morph", [ 0, [ 0 ], -1, -1, true ] ],
    [ "id", [ [ "foo" ] ] ],
    [ "ambiguous", [ 0 ] ],
  ]);
});

test("element with a mustache between two text nodes", function() {
  var opcodes = opcodesFor("<div> {{foo}} </div>");
  deepEqual(opcodes, [
    [ "morph", [ 0, [ 0 ], 0, 1, true ] ],
    [ "id", [ [ "foo" ] ] ],
    [ "ambiguous", [ 0 ] ],
  ]);
});

test("mustache two elements deep", function() {
  var opcodes = opcodesFor("<div><div>{{foo}}</div></div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "morph", [ 0, [ 0, 0 ], -1, -1, true ] ],
    [ "id", [ [ "foo" ] ] ],
    [ "ambiguous", [ 0 ] ],
    [ "popParent", [] ]
  ]);
});

test("two sibling elements with mustaches", function() {
  var opcodes = opcodesFor("<div>{{foo}}</div><div>{{bar}}</div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "morph", [ 0, [ 0 ], -1, -1, true ] ],
    [ "id", [ [ "foo" ] ] ],
    [ "ambiguous", [ 0 ] ],
    [ "popParent", [] ],
    [ "consumeParent", [ 1 ] ],
    [ "morph", [ 1, [ 1 ], -1, -1, true ] ],
    [ "id", [ [ "bar" ] ] ],
    [ "ambiguous", [ 1 ] ],
    [ "popParent", [] ]
  ]);
});

test("mustaches at the root", function() {
  var opcodes = opcodesFor("{{foo}} {{bar}}");
  deepEqual(opcodes, [
    [ "morph", [ 0, [ ], 0, 1, true ] ],
    [ "morph", [ 1, [ ], 1, 2, true ] ],
    [ "repairClonedNode", [ [ 0, 2 ] ] ],
    [ "id", [ [ "foo" ] ] ],
    [ "ambiguous", [ 0 ] ],
    [ "id", [ [ "bar" ] ] ],
    [ "ambiguous", [ 1 ] ],
  ]);
});

test("back to back mustaches should have a text node inserted between them", function() {
  var opcodes = opcodesFor("<div>{{foo}}{{bar}}{{baz}}wat{{qux}}</div>");
  deepEqual(opcodes, [
    [ "morph", [ 0, [0], -1, 0, true ] ],
    [ "morph", [ 1, [0], 0, 1, true ] ],
    [ "morph", [ 2, [0], 1, 2, true ] ],
    [ "morph", [ 3, [0], 2, -1, true] ],
    [ "repairClonedNode", [ [ 0, 1 ], false ] ],
    [ "id", [ [ "foo" ] ] ],
    [ "ambiguous", [ 0 ] ],
    [ "id", [ [ "bar" ] ] ],
    [ "ambiguous", [ 1 ] ],
    [ "id", [ [ "baz" ] ] ],
    [ "ambiguous", [ 2 ] ],
    [ "id", [ [ "qux" ] ] ],
    [ "ambiguous", [ 3 ] ],
  ]);
});

test("helper usage", function() {
  var opcodes = opcodesFor("<div>{{foo 'bar'}}</div>");
  deepEqual(opcodes, [
    [ "morph", [ 0, [0], -1, -1, true ] ],
    [ "program", [null, null] ],
    [ "id", [ [ "foo" ] ] ],
    [ "stringLiteral", ['bar'] ],
    [ "stackLiteral", [0] ],
    [ "helper", [ 1, 0 ] ],
  ]);
});

test("node mustache", function() {
  var opcodes = opcodesFor("<div {{foo}}></div>");
  deepEqual(opcodes, [
    [ "program", [null, null] ],
    [ "id", [ [ "foo" ] ] ],
    [ "stackLiteral", [0] ],
    [ "element", [0] ],
    [ "nodeHelper", [ 0, 0 ] ]
  ]);
});

test("node helper", function() {
  var opcodes = opcodesFor("<div {{foo 'bar'}}></div>");
  deepEqual(opcodes, [
    [ "program", [null, null] ],
    [ "id", [ [ "foo" ] ] ],
    [ "stringLiteral", ['bar'] ],
    [ "stackLiteral", [0] ],
    [ "element", [0] ],
    [ "nodeHelper", [ 1, 0 ] ]
  ]);
});

test("attribute mustache", function() {
  var opcodes = opcodesFor("<div class='before {{foo}} after'></div>");
  deepEqual(opcodes, [
    [ "program", [null, null] ],
    [ "id", [ [ "attribute" ] ] ],
    [ "stringLiteral", ["class"] ],
    [ "string", ["sexpr"] ],
    [ "program", [null, null] ],
    [ "id", [ [ "concat" ] ] ],
    [ "stringLiteral", ["before "] ],
    [ "string", ["sexpr"] ],
    [ "program", [null, null] ],
    [ "id", [ [ "foo" ] ] ],
    [ "stackLiteral", [0] ],
    [ "sexpr", [ 0 ] ],
    [ "stringLiteral", [" after"] ],
    [ "stackLiteral", [0] ],
    [ "sexpr", [ 3 ] ],
    [ "stackLiteral", [0] ],
    [ "element", [0] ],
    [ "nodeHelper", [ 2, 0 ] ]
  ]);
});


test("attribute helper", function() {
  var opcodes = opcodesFor("<div class='before {{foo 'bar'}} after'></div>");
  deepEqual(opcodes, [
    [ "program", [ null, null ] ],
    [ "id", [ [ "attribute" ] ] ],
    [ "stringLiteral", [ "class" ] ],
    [ "string", [ "sexpr" ] ],
    [ "program", [ null, null ] ],
    [ "id", [ [ "concat" ] ] ],
    [ "stringLiteral", [ "before " ] ],
    [ "string", [ "sexpr" ] ],
    [ "program", [ null, null ] ],
    [ "id", [ [ "foo" ] ] ],
    [ "stringLiteral", [ "bar" ] ],
    [ "stackLiteral", [ 0 ] ],
    [ "sexpr", [ 1 ] ],
    [ "stringLiteral", [ " after" ] ],
    [ "stackLiteral", [ 0 ] ],
    [ "sexpr", [ 3 ] ],
    [ "stackLiteral", [ 0 ] ],
    [ "element", [0] ],
    [ "nodeHelper", [ 2, 0 ] ]
  ]);
});
