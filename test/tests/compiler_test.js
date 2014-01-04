import { Compiler1 } from "htmlbars/compiler/pass1";
import { Compiler2 } from "htmlbars/compiler/pass2";
import { preprocess } from "htmlbars/parser";

function opcodesFor(html, options) {
  var ast = preprocess(html, options),
      compiler1 = new Compiler1(options);
  compiler1.compile(ast);
  console.log(JSON.stringify(compiler1.opcodes2));
  return compiler1.opcodes2;
}

module("Compiler opcode generation");

test("simple example", function() {
  var opcodes = opcodesFor("<div>{{foo}} bar {{baz}}</div>");
  deepEqual(opcodes, [
    ['foo', [0], null, 0],
    ['baz', [0], 0, null]
  ]);
});

test("element with a sole mustache child", function() {
  var opcodes = opcodesFor("<div>{{foo}}</div>");
  deepEqual(opcodes, [
    ['foo', [0], null, null]
  ]);
});

test("element with a mustache between two text nodes", function() {
  var opcodes = opcodesFor("<div> {{foo}} </div>");
  deepEqual(opcodes, [
    ['foo', [0], 0, 1]
  ]);
});

test("mustache two elements deep", function() {
  var opcodes = opcodesFor("<div><div>{{foo}}</div></div>");
  deepEqual(opcodes, [
    ['foo', [0, 0], null, null]
  ]);
});

test("two sibling elements with mustaches", function() {
  var opcodes = opcodesFor("<div>{{foo}}</div><div>{{bar}}</div>");
  deepEqual(opcodes, [
    ['foo', [0], null, null],
    ['bar', [1], null, null]
  ]);
});

test("mustaches at the root", function() {
  var opcodes = opcodesFor("{{foo}} {{bar}}");
  deepEqual(opcodes, [
    ['foo', [], null, 0],
    ['bar', [], 0, null]
  ]);
});

test("back to back mustaches should have a text node inserted between them", function() {
  var opcodes = opcodesFor("<div>{{foo}}{{bar}}{{baz}}wat{{qux}}</div>");
  deepEqual(opcodes, [
    ['foo', [0], null, 0],
    ['bar', [0], 0, 1],
    ['baz', [0], 1, 2],
    ['qux', [0], 2, null],
  ]);
});