import { HydrationOpcodeCompiler } from "htmlbars/compiler/hydration_opcode";
import { preprocess } from "htmlbars/parser";

function opcodesFor(html, options) {
  var ast = preprocess(html, options),
      compiler1 = new HydrationOpcodeCompiler(options);
  compiler1.compile(ast);
  return compiler1.opcodes;
}

function mustache(name, parent, start, end) {
  return [ 'ambiguous', [name, true, parent, start, end] ];
}

function helper(name, params, parent, start, end) {
  return [ "helper", [name, params.length, true, parent, start, end] ];
}

module("HydrationOpcodeCompiler opcode generation");

test("simple example", function() {
  var opcodes = opcodesFor("<div>{{foo}} bar {{baz}}</div>");
  deepEqual(opcodes, [
    mustache('foo', [0], -1, 0),
    mustache('baz', [0], 0, -1)
  ]);
});

test("element with a sole mustache child", function() {
  var opcodes = opcodesFor("<div>{{foo}}</div>");
  deepEqual(opcodes, [
    mustache('foo', [0], -1, -1)
  ]);
});

test("element with a mustache between two text nodes", function() {
  var opcodes = opcodesFor("<div> {{foo}} </div>");
  deepEqual(opcodes, [
    mustache('foo', [0], 0, 1)
  ]);
});

test("mustache two elements deep", function() {
  var opcodes = opcodesFor("<div><div>{{foo}}</div></div>");
  deepEqual(opcodes, [
    mustache('foo', [0, 0], -1, -1)
  ]);
});

test("two sibling elements with mustaches", function() {
  var opcodes = opcodesFor("<div>{{foo}}</div><div>{{bar}}</div>");
  deepEqual(opcodes, [
    mustache('foo', [0], -1, -1),
    mustache('bar', [1], -1, -1)
  ]);
});

test("mustaches at the root", function() {
  var opcodes = opcodesFor("{{foo}} {{bar}}");
  deepEqual(opcodes, [
    mustache('foo', [], 0, 1),
    mustache('bar', [], 1, 2)
  ]);
});

test("back to back mustaches should have a text node inserted between them", function() {
  var opcodes = opcodesFor("<div>{{foo}}{{bar}}{{baz}}wat{{qux}}</div>");
  deepEqual(opcodes, [
    mustache('foo', [0], -1, 0),
    mustache('bar', [0], 0, 1),
    mustache('baz', [0], 1, 2),
    mustache('qux', [0], 2, -1)
  ]);
});

test("helper usage", function() {
  var opcodes = opcodesFor("<div>{{foo 'bar'}}</div>");
  deepEqual(opcodes, [
    [ "program", [null, null] ],
    [ "stringLiteral", ['bar'] ],
    [ "stackLiteral", [0] ],
    helper('foo', ['bar'], [0], -1, -1)
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
    [ "string", [" after"] ],
    [ "ambiguousAttr", ["foo", true] ],
    [ "string", ["before "] ],
    [ "attribute", ["class", 3, [0]] ]
  ]);
});


test("attribute helper", function() {
  var opcodes = opcodesFor("<div class='before {{foo 'bar'}} after'></div>");
  deepEqual(opcodes, [
    [ "string", [" after"] ],
    [ "program", [null, null] ],
    [ "stringLiteral", ["bar"] ],
    [ "stackLiteral", [0] ],
    [ "helperAttr", ["foo",1,true] ],
    [ "string", ["before "] ],
    [ "attribute", ["class", 3, [0]] ]
  ]);
});
