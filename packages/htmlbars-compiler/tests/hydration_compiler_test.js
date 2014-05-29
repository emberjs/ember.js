import { HydrationOpcodeCompiler } from "htmlbars-compiler/compiler/hydration_opcode";
import { preprocess } from "htmlbars-compiler/parser";

function opcodesFor(html, options) {
  var ast = preprocess(html, options),
      compiler1 = new HydrationOpcodeCompiler(options);
  compiler1.compile(ast);
  return compiler1.opcodes;
}


function mustache(name, morphNum) {
  return [ 'ambiguous', [name, true, morphNum] ];
}

function helper(name, params, morphNum) {
  return [ "helper", [name, params.length, true, morphNum] ];
}

module("HydrationOpcodeCompiler opcode generation");

test("simple example", function() {
  var opcodes = opcodesFor("<div>{{foo}} bar {{baz}}</div>");
  deepEqual(opcodes, [
    [ "morph", [ 0, [ 0 ], -1, 0 ] ],
    [ "morph", [ 1, [ 0 ], 0, -1 ] ],
    mustache('foo', 0),
    mustache('baz', 1)
  ]);
});

test("element with a sole mustache child", function() {
  var opcodes = opcodesFor("<div>{{foo}}</div>");
  deepEqual(opcodes, [
    [ "morph", [ 0, [ 0 ], -1, -1 ] ],
    mustache('foo', 0)
  ]);
});

test("element with a mustache between two text nodes", function() {
  var opcodes = opcodesFor("<div> {{foo}} </div>");
  deepEqual(opcodes, [
    [ "morph", [ 0, [ 0 ], 0, 1 ] ],
    mustache('foo', 0)
  ]);
});

test("mustache two elements deep", function() {
  var opcodes = opcodesFor("<div><div>{{foo}}</div></div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "morph", [ 0, [ 0, 0 ], -1, -1 ] ],
    mustache('foo', 0),
    [ "popParent", [] ]
  ]);
});

test("two sibling elements with mustaches", function() {
  var opcodes = opcodesFor("<div>{{foo}}</div><div>{{bar}}</div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "morph", [ 0, [ 0 ], -1, -1 ] ],
    mustache('foo', 0),
    [ "popParent", [] ],
    [ "consumeParent", [ 1 ] ],
    [ "morph", [ 1, [ 1 ], -1, -1 ] ],
    mustache('bar', 1),
    [ "popParent", [] ]
  ]);
});

test("mustaches at the root", function() {
  var opcodes = opcodesFor("{{foo}} {{bar}}");
  deepEqual(opcodes, [
    [ "morph", [ 0, [ ], 0, 1 ] ],
    [ "morph", [ 1, [ ], 1, 2 ] ],
    mustache('foo', 0),
    mustache('bar', 1)
  ]);
});

test("back to back mustaches should have a text node inserted between them", function() {
  var opcodes = opcodesFor("<div>{{foo}}{{bar}}{{baz}}wat{{qux}}</div>");
  deepEqual(opcodes, [
    [ "morph", [ 0, [0], -1, 0 ] ],
    [ "morph", [ 1, [0], 0, 1 ] ],
    [ "morph", [ 2, [0], 1, 2 ] ],
    [ "morph", [ 3, [0], 2, -1 ] ],
    mustache('foo', 0),
    mustache('bar', 1),
    mustache('baz', 2),
    mustache('qux', 3)
  ]);
});

test("helper usage", function() {
  var opcodes = opcodesFor("<div>{{foo 'bar'}}</div>");
  deepEqual(opcodes, [
    [ "morph", [ 0, [0], -1, -1 ] ],
    [ "program", [null, null] ],
    [ "stringLiteral", ['bar'] ],
    [ "stackLiteral", [0] ],
    helper('foo', ['bar'], 0)
  ]);
});

test("node mustache", function() {
  var opcodes = opcodesFor("<div {{foo}}></div>");
  deepEqual(opcodes, [
    [ "program", [null, null] ],
    [ "stackLiteral", [0] ],
    [ "nodeHelper", ["foo", 0, [0]] ]
  ]);
});

test("node helper", function() {
  var opcodes = opcodesFor("<div {{foo 'bar'}}></div>");
  deepEqual(opcodes, [
    [ "program", [null, null] ],
    [ "stringLiteral", ['bar'] ],
    [ "stackLiteral", [0] ],
    [ "nodeHelper", ["foo", 1, [0]] ]
  ]);
});

test("attribute mustache", function() {
  var opcodes = opcodesFor("<div class='before {{foo}} after'></div>");
  deepEqual(opcodes, [
    [ "program", [null, null] ],
    [ "stringLiteral", ["class"] ],
    [ "string", ["sexpr"] ],
    [ "program", [null, null] ],
    [ "stringLiteral", ["before "] ],
    [ "string", ["sexpr"] ],
    [ "program", [null, null] ],
    [ "stackLiteral", [0] ],
    [ "sexpr", [ "foo", 0 ] ],
    [ "stringLiteral", [" after"] ],
    [ "stackLiteral", [0] ],
    [ "sexpr", [ "concat", 3 ] ],
    [ "stackLiteral", [0] ],
    [ "nodeHelper", [ "attribute", 2, [ 0 ] ] ]
  ]);
});


test("attribute helper", function() {
  var opcodes = opcodesFor("<div class='before {{foo 'bar'}} after'></div>");
  deepEqual(opcodes, [
    [ "program", [ null, null ] ],
    [ "stringLiteral", [ "class" ] ],
    [ "string", [ "sexpr" ] ],
    [ "program", [ null, null ] ],
    [ "stringLiteral", [ "before " ] ],
    [ "string", [ "sexpr" ] ],
    [ "program", [ null, null ] ],
    [ "stringLiteral", [ "bar" ] ],
    [ "stackLiteral", [ 0 ] ],
    [ "sexpr", [ "foo", 1 ] ],
    [ "stringLiteral", [ " after" ] ],
    [ "stackLiteral", [ 0 ] ],
    [ "sexpr", [ "concat", 3 ] ],
    [ "stackLiteral", [ 0 ] ],
    [ "nodeHelper", [ "attribute", 2, [ 0 ] ] ]
  ]);
});
