import HydrationOpcodeCompiler from "../htmlbars-compiler/hydration-opcode-compiler";
import { preprocess } from "../htmlbars-syntax/parser";

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
    [ "consumeParent", [ 0 ] ],
    [ "shareElement", [ 0 ] ],
    [ "createMorph", [ 0, [ 0 ], 0, 0, true ] ],
    [ "createMorph", [ 1, [ 0 ], 2, 2, true ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "printContentHook", [ 0 ] ],
    [ "pushLiteral", [ "baz" ] ],
    [ "printContentHook", [ 1 ] ],
    [ "popParent", [] ]
  ]);
});

test("simple block", function() {
  var opcodes = opcodesFor("<div>{{#foo}}{{/foo}}</div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "createMorph", [ 0, [ 0 ], 0, 0, true ] ],
    [ "prepareObject", [ 0 ] ],
    [ "prepareArray", [ 0 ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "printBlockHook", [ 0, 0, null ] ],
    [ "popParent", [] ]
  ]);
});

test("simple block with block params", function() {
  var opcodes = opcodesFor("<div>{{#foo as |bar baz|}}{{/foo}}</div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "createMorph", [ 0, [ 0 ], 0, 0, true ] ],
    [ "prepareObject", [ 0 ] ],
    [ "prepareArray", [ 0 ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "printBlockHook", [ 0, 0, null ] ],
    [ "popParent", [] ]
  ]);
});

test("element with a sole mustache child", function() {
  var opcodes = opcodesFor("<div>{{foo}}</div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "createMorph", [ 0, [ 0 ], 0, 0, true ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "printContentHook", [ 0 ] ],
    [ "popParent", [] ]
  ]);
});

test("element with a mustache between two text nodes", function() {
  var opcodes = opcodesFor("<div> {{foo}} </div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "createMorph", [ 0, [ 0 ], 1, 1, true ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "printContentHook", [ 0 ] ],
    [ "popParent", [] ]
  ]);
});

test("mustache two elements deep", function() {
  var opcodes = opcodesFor("<div><div>{{foo}}</div></div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "consumeParent", [ 0 ] ],
    [ "createMorph", [ 0, [ 0, 0 ], 0, 0, true ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "printContentHook", [ 0 ] ],
    [ "popParent", [] ],
    [ "popParent", [] ]
  ]);
});

test("two sibling elements with mustaches", function() {
  var opcodes = opcodesFor("<div>{{foo}}</div><div>{{bar}}</div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "createMorph", [ 0, [ 0 ], 0, 0, true ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "printContentHook", [ 0 ] ],
    [ "popParent", [] ],
    [ "consumeParent", [ 1 ] ],
    [ "createMorph", [ 1, [ 1 ], 0, 0, true ] ],
    [ "pushLiteral", [ "bar" ] ],
    [ "printContentHook", [ 1 ] ],
    [ "popParent", [] ]
  ]);
});

test("mustaches at the root", function() {
  var opcodes = opcodesFor("{{foo}} {{bar}}");
  deepEqual(opcodes, [
    [ "createMorph", [ 0, [ ], 0, 0, true ] ],
    [ "createMorph", [ 1, [ ], 2, 2, true ] ],
    [ "openBoundary", [ ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "printContentHook", [ 0 ] ],
    [ "closeBoundary", [ ] ],
    [ "pushLiteral", [ "bar" ] ],
    [ "printContentHook", [ 1 ] ]
  ]);
});

test("back to back mustaches should have a text node inserted between them", function() {
  var opcodes = opcodesFor("<div>{{foo}}{{bar}}{{baz}}wat{{qux}}</div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "shareElement", [ 0 ] ],
    [ "createMorph", [ 0, [0], 0, 0, true ] ],
    [ "createMorph", [ 1, [0], 1, 1, true ] ],
    [ "createMorph", [ 2, [0], 2, 2, true ] ],
    [ "createMorph", [ 3, [0], 4, 4, true] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "printContentHook", [ 0 ] ],
    [ "pushLiteral", [ "bar" ] ],
    [ "printContentHook", [ 1 ] ],
    [ "pushLiteral", [ "baz" ] ],
    [ "printContentHook", [ 2 ] ],
    [ "pushLiteral", [ "qux" ] ],
    [ "printContentHook", [ 3 ] ],
    [ "popParent", [] ]
  ]);
});

test("helper usage", function() {
  var opcodes = opcodesFor("<div>{{foo 'bar' baz.bat true 3.14}}</div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "createMorph", [ 0, [0], 0, 0, true ] ],
    [ "prepareObject", [ 0 ] ],
    [ "pushLiteral", [ 3.14 ] ],
    [ "pushLiteral", [ true ] ],
    [ "pushGetHook", [ "baz.bat", 0 ] ],
    [ "pushLiteral", [ "bar" ] ],
    [ "prepareArray", [ 4 ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "printInlineHook", [ 0 ] ],
    [ "popParent", [] ]
  ]);
});

test("node mustache", function() {
  var opcodes = opcodesFor("<div {{foo}}></div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "prepareObject", [ 0 ] ],
    [ "prepareArray", [ 0 ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "shareElement", [ 0 ] ],
    [ "createElementMorph", [ 0, 0 ] ],
    [ "printElementHook", [ 0 ] ],
    [ "popParent", [] ]
  ]);
});

test("node helper", function() {
  var opcodes = opcodesFor("<div {{foo 'bar'}}></div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "prepareObject", [ 0 ] ],
    [ "pushLiteral", [ "bar" ] ],
    [ "prepareArray", [ 1 ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "shareElement", [ 0 ] ],
    [ "createElementMorph", [ 0, 0 ] ],
    [ "printElementHook", [ 0 ] ],
    [ "popParent", [] ]
  ]);
});

test("attribute mustache", function() {
  var opcodes = opcodesFor("<div class='before {{foo}} after'></div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "pushLiteral", [ " after" ] ],
    [ "pushGetHook", [ "foo", 0 ] ],
    [ "pushLiteral", [ "before " ] ],
    [ "prepareArray", [ 3 ] ],
    [ "pushConcatHook", [ 0 ] ],
    [ "pushLiteral", [ "class" ] ],
    [ "shareElement", [ 0 ] ],
    [ "createAttrMorph", [ 0, 0, "class", true, null ] ],
    [ "printAttributeHook", [ 0 ] ],
    [ "popParent", [] ]
  ]);
});

test("quoted attribute mustache", function() {
  var opcodes = opcodesFor("<div class='{{foo}}'></div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "pushGetHook", [ "foo", 0 ] ],
    [ "prepareArray", [ 1 ] ],
    [ "pushConcatHook", [ 0 ] ],
    [ "pushLiteral", [ "class" ] ],
    [ "shareElement", [ 0 ] ],
    [ "createAttrMorph", [ 0, 0, "class", true, null ] ],
    [ "printAttributeHook", [ 0 ] ],
    [ "popParent", [] ]
  ]);
});

test("safe bare attribute mustache", function() {
  var opcodes = opcodesFor("<div class={{foo}}></div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "pushGetHook", [ "foo", 0 ] ],
    [ "pushLiteral", [ "class" ] ],
    [ "shareElement", [ 0 ] ],
    [ "createAttrMorph", [ 0, 0, "class", true, null ] ],
    [ "printAttributeHook", [ 0 ] ],
    [ "popParent", [] ]
  ]);
});

test("unsafe bare attribute mustache", function() {
  var opcodes = opcodesFor("<div class={{{foo}}}></div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "pushGetHook", [ "foo", 0 ] ],
    [ "pushLiteral", [ "class" ] ],
    [ "shareElement", [ 0 ] ],
    [ "createAttrMorph", [ 0, 0, "class", false, null ] ],
    [ "printAttributeHook", [ 0 ] ],
    [ "popParent", [] ]
  ]);
});

test("attribute helper", function() {
  var opcodes = opcodesFor("<div class='before {{foo 'bar'}} after'></div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "pushLiteral", [ " after" ] ],
    [ "prepareObject", [ 0 ] ],
    [ "pushLiteral", [ "bar" ] ],
    [ "prepareArray", [ 1 ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "pushSexprHook", [ 0 ] ],
    [ "pushLiteral", [ "before " ] ],
    [ "prepareArray", [ 3 ] ],
    [ "pushConcatHook", [ 0 ] ],
    [ "pushLiteral", [ "class" ] ],
    [ "shareElement", [ 0 ] ],
    [ "createAttrMorph", [ 0, 0, "class", true, null ] ],
    [ "printAttributeHook", [ 0 ] ],
    [ "popParent", [] ]
  ]);
});

test("attribute helpers", function() {
  var opcodes = opcodesFor("<div class='before {{foo 'bar'}} after' id={{bare}}></div>{{morphThing}}<span class='{{ohMy}}'></span>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "shareElement", [ 0 ] ],
    [ "pushLiteral", [ " after" ] ],
    [ "prepareObject", [ 0 ] ],
    [ "pushLiteral", [ "bar" ] ],
    [ "prepareArray", [ 1 ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "pushSexprHook", [ 0 ] ],
    [ "pushLiteral", [ "before " ] ],
    [ "prepareArray", [ 3 ] ],
    [ "pushConcatHook", [ 0 ] ],
    [ "pushLiteral", [ "class" ] ],
    [ "createAttrMorph", [ 0, 0, "class", true, null ] ],
    [ "printAttributeHook", [ 0 ] ],
    [ "pushGetHook", [ 'bare', 1 ] ],
    [ "pushLiteral", [ 'id' ] ],
    [ "createAttrMorph", [ 1, 0, 'id', true, null ] ],
    [ "printAttributeHook", [ 1 ] ],
    [ "popParent", [] ],
    [ "createMorph", [ 2, [], 1, 1, true ] ],
    [ "pushLiteral", [ 'morphThing' ] ],
    [ "printContentHook", [ 2 ] ],
    [ "consumeParent", [ 2 ] ],
    [ "pushGetHook", [ 'ohMy', 3 ] ],
    [ "prepareArray", [ 1 ] ],
    [ "pushConcatHook", [ 3 ] ],
    [ "pushLiteral", [ 'class' ] ],
    [ "shareElement", [ 1 ] ],
    [ "createAttrMorph", [ 3, 1, 'class', true, null ] ],
    [ "printAttributeHook", [ 3 ] ],
    [ "popParent", [] ]
  ]);
});
