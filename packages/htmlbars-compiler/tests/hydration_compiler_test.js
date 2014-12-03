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
    [ "printContentHookForAmbiguous", [ 0 ] ],
    [ "pushLiteral", [ "baz" ] ],
    [ "printContentHookForAmbiguous", [ 1 ] ],
  ]);
});

test("simple block", function() {
  var opcodes = opcodesFor("<div>{{#foo}}{{/foo}}</div>");
  deepEqual(opcodes, [
    [ "printMorphCreation", [ 0, [ 0 ], null, null, true ] ],
    [ "prepareObject", [ 0 ] ],
    [ "prepareArray", [ 0 ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "printContentHookForBlockHelper", [ 0, 0, null, 0 ] ]
  ]);
});

test("simple block with block params", function() {
  var opcodes = opcodesFor("<div>{{#foo as |bar baz|}}{{/foo}}</div>");
  deepEqual(opcodes, [
    [ "printMorphCreation", [ 0, [ 0 ], null, null, true ] ],
    [ "prepareObject", [ 0 ] ],
    [ "prepareArray", [ 0 ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "printContentHookForBlockHelper", [ 0, 0, null, 2 ] ]
  ]);
});

test("element with a sole mustache child", function() {
  var opcodes = opcodesFor("<div>{{foo}}</div>");
  deepEqual(opcodes, [
    [ "printMorphCreation", [ 0, [ 0 ], -1, -1, true ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "printContentHookForAmbiguous", [ 0 ] ],
  ]);
});

test("element with a mustache between two text nodes", function() {
  var opcodes = opcodesFor("<div> {{foo}} </div>");
  deepEqual(opcodes, [
    [ "printMorphCreation", [ 0, [ 0 ], 0, 1, true ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "printContentHookForAmbiguous", [ 0 ] ],
  ]);
});

test("mustache two elements deep", function() {
  var opcodes = opcodesFor("<div><div>{{foo}}</div></div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "printMorphCreation", [ 0, [ 0, 0 ], -1, -1, true ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "printContentHookForAmbiguous", [ 0 ] ],
    [ "popParent", [] ]
  ]);
});

test("two sibling elements with mustaches", function() {
  var opcodes = opcodesFor("<div>{{foo}}</div><div>{{bar}}</div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "printMorphCreation", [ 0, [ 0 ], -1, -1, true ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "printContentHookForAmbiguous", [ 0 ] ],
    [ "popParent", [] ],
    [ "consumeParent", [ 1 ] ],
    [ "printMorphCreation", [ 1, [ 1 ], -1, -1, true ] ],
    [ "pushLiteral", [ "bar" ] ],
    [ "printContentHookForAmbiguous", [ 1 ] ],
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
    [ "printContentHookForAmbiguous", [ 0 ] ],
    [ "pushLiteral", [ "bar" ] ],
    [ "printContentHookForAmbiguous", [ 1 ] ],
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
    [ "printContentHookForAmbiguous", [ 0 ] ],
    [ "pushLiteral", [ "bar" ] ],
    [ "printContentHookForAmbiguous", [ 1 ] ],
    [ "pushLiteral", [ "baz" ] ],
    [ "printContentHookForAmbiguous", [ 2 ] ],
    [ "pushLiteral", [ "qux" ] ],
    [ "printContentHookForAmbiguous", [ 3 ] ],
  ]);
});

test("helper usage", function() {
  var opcodes = opcodesFor("<div>{{foo 'bar' baz.bat true 3.14}}</div>");
  deepEqual(opcodes, [
    [ "printMorphCreation", [ 0, [0], -1, -1, true ] ],
    [ "prepareObject", [ 0 ] ],
    [ "pushLiteral", [ 3.14 ] ],
    [ "pushLiteral", [ true ] ],
    [ "pushGetHook", [ "baz.bat" ] ],
    [ "pushLiteral", [ "bar" ] ],
    [ "prepareArray", [ 4 ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "printContentHookForInlineHelper", [ 0 ] ]
  ]);
});

test("node mustache", function() {
  var opcodes = opcodesFor("<div {{foo}}></div>");
  deepEqual(opcodes, [
    [ "prepareObject", [ 0 ] ],
    [ "prepareArray", [ 0 ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "shareElement", [ 0 ] ],
    [ "printElementHook", [ 0 ] ]
  ]);
});

test("node helper", function() {
  var opcodes = opcodesFor("<div {{foo 'bar'}}></div>");
  deepEqual(opcodes, [
    [ "prepareObject", [ 0 ] ],
    [ "pushLiteral", [ "bar" ] ],
    [ "prepareArray", [ 1 ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "shareElement", [ 0 ] ],
    [ "printElementHook", [ 0 ] ]
  ]);
});

test("attribute mustache", function() {
  var opcodes = opcodesFor("<div class='before {{foo}} after'></div>");
  deepEqual(opcodes, [
    [ "pushLiteral", [ " after" ] ],
    [ "pushGetHook", [ "foo" ] ],
    [ "pushLiteral", [ "before " ] ],
    [ "prepareArray", [ 3 ] ],
    [ "pushConcatHook", [ ] ],
    [ "pushLiteral", [ "class" ] ],
    [ "shareElement", [ 0 ] ],
    [ "printAttributeHook", [ 0, true ] ]
  ]);
});


test("attribute helper", function() {
  var opcodes = opcodesFor("<div class='before {{foo 'bar'}} after'></div>");
  deepEqual(opcodes, [
    [ "pushLiteral", [ " after" ] ],
    [ "prepareObject", [ 0 ] ],
    [ "pushLiteral", [ "bar" ] ],
    [ "prepareArray", [ 1 ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "pushSexprHook", [ ] ],
    [ "pushLiteral", [ "before " ] ],
    [ "prepareArray", [ 3 ] ],
    [ "pushConcatHook", [ ] ],
    [ "pushLiteral", [ "class" ] ],
    [ "shareElement", [ 0 ] ],
    [ "printAttributeHook", [ 0, true ] ]
  ]);
});
