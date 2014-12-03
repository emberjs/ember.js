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
    [ "printMorphCreation", [ 0, [ 0 ], -1, 0, true ] ],
    [ "printMorphCreation", [ 1, [ 0 ], 0, -1, true ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "printAmbiguousMustacheInBody", [ 0 ] ],
    [ "pushLiteral", [ "baz" ] ],
    [ "printAmbiguousMustacheInBody", [ 1 ] ],
  ]);
});

test("simple block", function() {
  var opcodes = opcodesFor("<div>{{#foo}}{{/foo}}</div>");
  deepEqual(opcodes, [
    [ "printMorphCreation", [ 0, [ 0 ], null, null, true ] ],
    [ "pushProgramIds", [ 0, null ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "pushRaw", [ 0 ] ],
    [ "printHelperInContent", [ 0, 0, 0 ] ]
  ]);
});

test("simple block with block params", function() {
  var opcodes = opcodesFor("<div>{{#foo as |bar baz|}}{{/foo}}</div>");
  deepEqual(opcodes, [
    [ "printMorphCreation", [ 0, [ 0 ], null, null, true ] ],
    [ "pushProgramIds", [ 0, null ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "pushRaw", [ 0 ] ],
    [ "printHelperInContent", [ 0, 0, 2 ] ]
  ]);
});

test("element with a sole mustache child", function() {
  var opcodes = opcodesFor("<div>{{foo}}</div>");
  deepEqual(opcodes, [
    [ "printMorphCreation", [ 0, [ 0 ], -1, -1, true ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "printAmbiguousMustacheInBody", [ 0 ] ],
  ]);
});

test("element with a mustache between two text nodes", function() {
  var opcodes = opcodesFor("<div> {{foo}} </div>");
  deepEqual(opcodes, [
    [ "printMorphCreation", [ 0, [ 0 ], 0, 1, true ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "printAmbiguousMustacheInBody", [ 0 ] ],
  ]);
});

test("mustache two elements deep", function() {
  var opcodes = opcodesFor("<div><div>{{foo}}</div></div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "printMorphCreation", [ 0, [ 0, 0 ], -1, -1, true ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "printAmbiguousMustacheInBody", [ 0 ] ],
    [ "popParent", [] ]
  ]);
});

test("two sibling elements with mustaches", function() {
  var opcodes = opcodesFor("<div>{{foo}}</div><div>{{bar}}</div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "printMorphCreation", [ 0, [ 0 ], -1, -1, true ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "printAmbiguousMustacheInBody", [ 0 ] ],
    [ "popParent", [] ],
    [ "consumeParent", [ 1 ] ],
    [ "printMorphCreation", [ 1, [ 1 ], -1, -1, true ] ],
    [ "pushLiteral", [ "bar" ] ],
    [ "printAmbiguousMustacheInBody", [ 1 ] ],
    [ "popParent", [] ]
  ]);
});

test("mustaches at the root", function() {
  var opcodes = opcodesFor("{{foo}} {{bar}}");
  deepEqual(opcodes, [
    [ "printMorphCreation", [ 0, [ ], 0, 1, true ] ],
    [ "printMorphCreation", [ 1, [ ], 1, 2, true ] ],
    [ "repairClonedNode", [ [ 0, 2 ] ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "printAmbiguousMustacheInBody", [ 0 ] ],
    [ "pushLiteral", [ "bar" ] ],
    [ "printAmbiguousMustacheInBody", [ 1 ] ],
  ]);
});

test("back to back mustaches should have a text node inserted between them", function() {
  var opcodes = opcodesFor("<div>{{foo}}{{bar}}{{baz}}wat{{qux}}</div>");
  deepEqual(opcodes, [
    [ "printMorphCreation", [ 0, [0], -1, 0, true ] ],
    [ "printMorphCreation", [ 1, [0], 0, 1, true ] ],
    [ "printMorphCreation", [ 2, [0], 1, 2, true ] ],
    [ "printMorphCreation", [ 3, [0], 2, -1, true] ],
    [ "repairClonedNode", [ [ 0, 1 ], false ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "printAmbiguousMustacheInBody", [ 0 ] ],
    [ "pushLiteral", [ "bar" ] ],
    [ "printAmbiguousMustacheInBody", [ 1 ] ],
    [ "pushLiteral", [ "baz" ] ],
    [ "printAmbiguousMustacheInBody", [ 2 ] ],
    [ "pushLiteral", [ "qux" ] ],
    [ "printAmbiguousMustacheInBody", [ 3 ] ],
  ]);
});

test("helper usage", function() {
  var opcodes = opcodesFor("<div>{{foo 'bar' baz.bat true 3.14}}</div>");
  deepEqual(opcodes, [
    [ "printMorphCreation", [ 0, [0], -1, -1, true ] ],
    [ "pushProgramIds", [null, null] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "pushLiteral", ["bar"] ],
    [ "pushGetHook", ["baz.bat"] ],
    [ "pushLiteral", [true] ],
    [ "pushLiteral", [3.14] ],
    [ "pushRaw", [0] ],
    [ "printHelperInContent", [ 4, 0 ] ],
  ]);
});

test("node mustache", function() {
  var opcodes = opcodesFor("<div {{foo}}></div>");
  deepEqual(opcodes, [
    [ "pushProgramIds", [null, null] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "pushRaw", [0] ],
    [ "shareElement", [0] ],
    [ "printElementHook", [ 0, 0 ] ]
  ]);
});

test("node helper", function() {
  var opcodes = opcodesFor("<div {{foo 'bar'}}></div>");
  deepEqual(opcodes, [
    [ "pushProgramIds", [null, null] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "pushLiteral", ['bar'] ],
    [ "pushRaw", [0] ],
    [ "shareElement", [0] ],
    [ "printElementHook", [ 1, 0 ] ]
  ]);
});

test("attribute mustache", function() {
  var opcodes = opcodesFor("<div class='before {{foo}} after'></div>");
  deepEqual(opcodes, [
    [ "pushProgramIds", [null, null] ],
    [ "pushLiteral", [ "" ] ],
    [ "pushLiteral", ["before "] ],
    [ "pushGetHook", ["foo"] ],
    [ "pushLiteral", [" after"] ],
    [ "pushRaw", [0] ],
    [ "shareElement", [0] ],
    [ "printAttributeHook", [ true, "class", 3, 0 ] ]
  ]);
});


test("attribute helper", function() {
  var opcodes = opcodesFor("<div class='before {{foo 'bar'}} after'></div>");
  deepEqual(opcodes, [
    [ "pushProgramIds", [ null, null ] ],
    [ "pushLiteral", [ "" ] ],
    [ "pushLiteral", [ "before " ] ],
    [ "pushProgramIds", [ null, null ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "pushLiteral", [ "bar" ] ],
    [ "pushRaw", [ 0 ] ],
    [ "pushSexprHook", [ 1 ] ],
    [ "pushLiteral", [ " after" ] ],
    [ "pushRaw", [ 0 ] ],
    [ "shareElement", [0] ],
    [ "printAttributeHook", [ true, "class", 3, 0] ]
  ]);
});
