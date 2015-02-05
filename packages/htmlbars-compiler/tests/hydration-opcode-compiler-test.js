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
    [ "createMorph", [ 1, [ 0 ], 0, 0, true ] ],
    [ "createMorph", [ 2, [ 0 ], 2, 2, true ] ],
    [ "createElementMorph", [ 0, 0 ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "printContentHook", [ 1 ] ],
    [ "pushLiteral", [ "baz" ] ],
    [ "printContentHook", [ 2 ] ],
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
    [ "createMorph", [ 1, [0], 0, 0, true ] ],
    [ "createMorph", [ 2, [0], 1, 1, true ] ],
    [ "createMorph", [ 3, [0], 2, 2, true ] ],
    [ "createMorph", [ 4, [0], 4, 4, true] ],
    [ "createElementMorph", [ 0, 0 ] ],
    [ "repairClonedNode", [ [ 0, 1 ], false ] ],
    [ "pushLiteral", [ "foo" ] ],
    [ "printContentHook", [ 1 ] ],
    [ "pushLiteral", [ "bar" ] ],
    [ "printContentHook", [ 2 ] ],
    [ "pushLiteral", [ "baz" ] ],
    [ "printContentHook", [ 3 ] ],
    [ "pushLiteral", [ "qux" ] ],
    [ "printContentHook", [ 4 ] ],
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
    [ "pushGetHook", [ "baz.bat" ] ],
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
    [ "pushGetHook", [ "foo" ] ],
    [ "pushLiteral", [ "before " ] ],
    [ "prepareArray", [ 3 ] ],
    [ "pushConcatHook", [ ] ],
    [ "pushLiteral", [ "class" ] ],
    [ "shareElement", [ 0 ] ],
    [ "createElementMorph", [ 0, 0 ] ],
    [ "createAttrMorph", [ 1, 0, "class", true, null ] ],
    [ "printAttributeHook", [ 1 ] ],
    [ "popParent", [] ]
  ]);
});

test("quoted attribute mustache", function() {
  var opcodes = opcodesFor("<div class='{{foo}}'></div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "pushGetHook", [ "foo" ] ],
    [ "prepareArray", [ 1 ] ],
    [ "pushConcatHook", [ ] ],
    [ "pushLiteral", [ "class" ] ],
    [ "shareElement", [ 0 ] ],
    [ "createElementMorph", [ 0, 0 ] ],
    [ "createAttrMorph", [ 1, 0, "class", true, null ] ],
    [ "printAttributeHook", [ 1 ] ],
    [ "popParent", [] ]
  ]);
});

test("safe bare attribute mustache", function() {
  var opcodes = opcodesFor("<div class={{foo}}></div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "pushGetHook", [ "foo" ] ],
    [ "pushLiteral", [ "class" ] ],
    [ "shareElement", [ 0 ] ],
    [ "createElementMorph", [ 0, 0 ] ],
    [ "createAttrMorph", [ 1, 0, "class", true, null ] ],
    [ "printAttributeHook", [ 1 ] ],
    [ "popParent", [] ]
  ]);
});

test("unsafe bare attribute mustache", function() {
  var opcodes = opcodesFor("<div class={{{foo}}}></div>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "pushGetHook", [ "foo" ] ],
    [ "pushLiteral", [ "class" ] ],
    [ "shareElement", [ 0 ] ],
    [ "createElementMorph", [ 0, 0 ] ],
    [ "createAttrMorph", [ 1, 0, "class", false, null ] ],
    [ "printAttributeHook", [ 1 ] ],
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
    [ "pushSexprHook", [ ] ],
    [ "pushLiteral", [ "before " ] ],
    [ "prepareArray", [ 3 ] ],
    [ "pushConcatHook", [ ] ],
    [ "pushLiteral", [ "class" ] ],
    [ "shareElement", [ 0 ] ],
    [ "createElementMorph", [ 0, 0 ] ],
    [ "createAttrMorph", [ 1, 0, "class", true, null ] ],
    [ "printAttributeHook", [ 1 ] ],
    [ "popParent", [] ]
  ]);
});

test("attribute helpers", function() {
  var opcodes = opcodesFor("<div class='before {{foo 'bar'}} after' id={{bare}}></div>{{morphThing}}<span class='{{ohMy}}'></span>");
  deepEqual(opcodes, [
    [ "consumeParent", [ 0 ] ],
    [ "shareElement", [ 0 ] ],
    [ "createElementMorph", [ 0, 0 ] ],
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
    [ "createAttrMorph", [ 1, 0, "class", true, null ] ],
    [ "printAttributeHook", [ 1 ] ],
    [ "pushGetHook", [ 'bare' ] ],
    [ "pushLiteral", [ 'id' ] ],
    [ "createAttrMorph", [ 2, 0, 'id', true, null ] ],
    [ "printAttributeHook", [ 2 ] ],
    [ "popParent", [] ],
    [ "createMorph", [ 3, [], 0, 1, true ] ],
    [ "pushLiteral", [ 'morphThing' ] ],
    [ "printContentHook", [ 3 ] ],
    [ "consumeParent", [ 1 ] ],
    [ "pushGetHook", [ 'ohMy' ] ],
    [ "prepareArray", [ 1 ] ],
    [ "pushConcatHook", [] ],
    [ "pushLiteral", [ 'class' ] ],
    [ "shareElement", [ 1 ] ],
    [ "createElementMorph", [ 4, 1 ] ],
    [ "createAttrMorph", [ 5, 1, 'class', true, null ] ],
    [ "printAttributeHook", [ 5 ] ],
    [ "popParent", [] ]
  ]);
});
