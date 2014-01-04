import { HydrationCompiler } from "htmlbars/compiler/hydration";
import { preprocess } from "htmlbars/parser";
import { compileAST } from "htmlbars/compiler/compile";

function opcodesFor(html, options) {
  var ast = preprocess(html, options),
      compiler1 = new HydrationCompiler(compileAST, options);
  compiler1.compile(ast);
  return compiler1.opcodes;
}

function mustache(name, parent, start, end) {
  return {type: 'ambiguous', params: [name, true, parent, start, end]};
}

function helper(name, params, parent, start, end) {
  return {type: "helper", params: [name, params.length, true, parent, start, end]};
}

module("HydrationCompiler opcode generation");

test("simple example", function() {
  var opcodes = opcodesFor("<div>{{foo}} bar {{baz}}</div>");
  deepEqual(opcodes, [
    mustache('foo', [0], null, 0),
    mustache('baz', [0], 0, null)
  ]);
});

test("element with a sole mustache child", function() {
  var opcodes = opcodesFor("<div>{{foo}}</div>");
  deepEqual(opcodes, [
    mustache('foo', [0], null, null)
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
    mustache('foo', [0, 0], null, null)
  ]);
});

test("two sibling elements with mustaches", function() {
  var opcodes = opcodesFor("<div>{{foo}}</div><div>{{bar}}</div>");
  deepEqual(opcodes, [
    mustache('foo', [0], null, null),
    mustache('bar', [1], null, null)
  ]);
});

test("mustaches at the root", function() {
  var opcodes = opcodesFor("{{foo}} {{bar}}");
  deepEqual(opcodes, [
    mustache('foo', [], null, 0),
    mustache('bar', [], 0, null)
  ]);
});

test("back to back mustaches should have a text node inserted between them", function() {
  var opcodes = opcodesFor("<div>{{foo}}{{bar}}{{baz}}wat{{qux}}</div>");
  deepEqual(opcodes, [
    mustache('foo', [0], null, 0),
    mustache('bar', [0], 0, 1),
    mustache('baz', [0], 1, 2),
    mustache('qux', [0], 2, null)
  ]);
});

test("helper usage", function() {
  var opcodes = opcodesFor("<div>{{foo 'bar'}}</div>");
  deepEqual(opcodes, [
    {type: "program", params: [null]},
    {type: "string", params: ['bar']},
    {type: "stackLiteral", params: [0]},
    helper('foo', ['bar'], [0], null, null)
  ]);
});

test("node mustache", function() {
  var opcodes = opcodesFor("<div {{foo}}></div>");
  deepEqual(opcodes, [
    {type: "program", params: [null]},
    {type: "stackLiteral", params: [0]},
    {type: "nodeHelper", params:["foo", 0, [0]]}
  ]);
});

test("node helper", function() {
  var opcodes = opcodesFor("<div {{foo 'bar'}}></div>");
  deepEqual(opcodes, [
    {type: "program", params: [null]},
    {type: "string", params: ['bar']},
    {type: "stackLiteral", params: [0]},
    {type: "nodeHelper", params:["foo", 1, [0]]}
  ]);
});

test("attribute mustache", function() {
  var opcodes = opcodesFor("<div class='before {{foo}} after'></div>");
  deepEqual(opcodes, [
    {type: "content", params: ["before "]},
    {type: "ambiguous", params: ["foo", true]},
    {type: "content", params: [" after"]},
    {type: "attribute", params: ["class", 3, [0]]}
  ]);
});


test("attribute helper", function() {
  var opcodes = opcodesFor("<div class='before {{foo 'bar'}} after'></div>");
  deepEqual(opcodes, [
    {type: "content", params: ["before "]},
    {"type":"program","params":[null]},
    {"type":"string","params":["bar"]},
    {"type":"stackLiteral","params":[0]},
    {"type":"helper","params":["foo",1,true]},
    {type: "content", params: [" after"]},
    {type: "attribute", params: ["class", 3, [0]]}
  ]);
});