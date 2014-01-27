import { HydrationOpcodeCompiler } from "htmlbars/compiler/hydration_opcode";
import { preprocess } from "htmlbars/parser";

function opcodesFor(html, options) {
  var ast = preprocess(html, options),
      compiler1 = new HydrationOpcodeCompiler(options);
  compiler1.compile(ast);
  return compiler1.opcodes;
}


function mustache(name, placeholderNum) {
  return [ 'ambiguous', [name, true, placeholderNum] ];
}

function helper(name, params, placeholderNum) {
  return [ "helper", [name, params.length, true, placeholderNum] ];
}

module("HydrationOpcodeCompiler opcode generation");

test("simple example", function() {
  var opcodes = opcodesFor("<div>{{foo}} bar {{baz}}</div>");
  deepEqual(opcodes, [
    [ "shareParent", [ 0 ] ],
    [ "placeholder", [ 0, [ 0 ], -1, 0 ] ],
    [ "placeholder", [ 1, [ 0 ], 0, -1 ] ],
    mustache('foo', 0),
    mustache('baz', 1),
    [ "popParent", [] ]
  ]);
});

test("element with a sole mustache child", function() {
  var opcodes = opcodesFor("<div>{{foo}}</div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "placeholder", [ 0, [ 0 ], -1, -1 ] ],
    mustache('foo', 0),
    [ "popParent", [] ]
  ]);
});

test("element with a mustache between two text nodes", function() {
  var opcodes = opcodesFor("<div> {{foo}} </div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "placeholder", [ 0, [ 0 ], 0, 1 ] ],
    mustache('foo', 0),
    [ "popParent", [] ]
  ]);
});

test("mustache two elements deep", function() {
  var opcodes = opcodesFor("<div><div>{{foo}}</div></div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "consumeParent", [ 0 ] ],
    [ "placeholder", [ 0, [ 0, 0 ], -1, -1 ] ],
    mustache('foo', 0),
    [ "popParent", [] ],
    [ "popParent", [] ]
  ]);
});

test("two sibling elements with mustaches", function() {
  var opcodes = opcodesFor("<div>{{foo}}</div><div>{{bar}}</div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "placeholder", [ 0, [ 0 ], -1, -1 ] ],
    mustache('foo', 0),
    [ "popParent", [] ],
    [ "consumeParent", [ 1 ] ],
    [ "placeholder", [ 1, [ 1 ], -1, -1 ] ],
    mustache('bar', 1),
    [ "popParent", [] ]
  ]);
});

test("mustaches at the root", function() {
  var opcodes = opcodesFor("{{foo}} {{bar}}");
  deepEqual(opcodes, [
    [ "placeholder", [ 0, [ ], 0, 1 ] ],
    [ "placeholder", [ 1, [ ], 1, 2 ] ],
    mustache('foo', 0),
    mustache('bar', 1)
  ]);
});

test("back to back mustaches should have a text node inserted between them", function() {
  var opcodes = opcodesFor("<div>{{foo}}{{bar}}{{baz}}wat{{qux}}</div>");
  deepEqual(opcodes, [
    [ "shareParent", [ 0 ] ],
    [ "placeholder", [ 0, [0], -1, 0 ] ],
    [ "placeholder", [ 1, [0], 0, 1 ] ],
    [ "placeholder", [ 2, [0], 1, 2 ] ],
    [ "placeholder", [ 3, [0], 2, -1 ] ],
    mustache('foo', 0),
    mustache('bar', 1),
    mustache('baz', 2),
    mustache('qux', 3),
    [ "popParent", [] ]
  ]);
});

test("helper usage", function() {
  var opcodes = opcodesFor("<div>{{foo 'bar'}}</div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "placeholder", [ 0, [0], -1, -1 ] ],
    [ "program", [null, null] ],
    [ "stringLiteral", ['bar'] ],
    [ "stackLiteral", [0] ],
    helper('foo', ['bar'], 0),
    [ "popParent", [] ]
  ]);
});

test("node mustache", function() {
  var opcodes = opcodesFor("<div {{foo}}></div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "program", [null, null] ],
    [ "stackLiteral", [0] ],
    [ "nodeHelper", ["foo", 0, [0]] ],
    [ "popParent", [] ]
  ]);
});

test("node helper", function() {
  var opcodes = opcodesFor("<div {{foo 'bar'}}></div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "program", [null, null] ],
    [ "stringLiteral", ['bar'] ],
    [ "stackLiteral", [0] ],
    [ "nodeHelper", ["foo", 1, [0]] ],
    [ "popParent", [] ]
  ]);
});

test("attribute mustache", function() {
  var opcodes = opcodesFor("<div class='before {{foo}} after'></div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "program", [null, null] ],
    [ "stringLiteral", ["class"] ],
    [ "stringLiteral", ["before "] ],
    [ "string", ["sexpr"] ],
    [ "program", [null, null] ],
    [ "stackLiteral", [0] ],
    [ "sexpr", [ "foo", 0 ] ],
    [ "stringLiteral", [" after"] ],
    [ "stackLiteral", [0] ],
    [ "nodeHelper", [ "ATTRIBUTE", 4, [ 0 ] ] ],
    [ "popParent", [] ]
  ]);
});


test("attribute helper", function() {
  var opcodes = opcodesFor("<div class='before {{foo 'bar'}} after'></div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "program", [ null, null ] ],
    [ "stringLiteral", [ "class" ] ],
    [ "stringLiteral", [ "before " ] ],
    [ "string", [ "sexpr" ] ],
    [ "program", [ null, null ] ],
    [ "stringLiteral", [ "bar" ] ],
    [ "stackLiteral", [ 0 ] ],
    [ "sexpr", [ "foo", 1 ] ],
    [ "stringLiteral", [ " after" ] ],
    [ "stackLiteral", [ 0 ] ],
    [ "nodeHelper", [ "ATTRIBUTE", 4, [ 0 ] ] ],
    [ "popParent", [] ]
  ]);
});
