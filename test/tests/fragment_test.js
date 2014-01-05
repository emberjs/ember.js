import { FragmentOpcodeCompiler } from "htmlbars/compiler/fragment_opcode";
import { HydrationOpcodeCompiler } from "htmlbars/compiler/hydration_opcode";
import { FragmentCompiler } from "htmlbars/compiler/fragment";
import { HydrationCompiler } from "htmlbars/compiler/hydration";
import { compileAST } from "htmlbars/compiler/compile";
import { Range } from "htmlbars/runtime/range";
import { preprocess } from "htmlbars/parser";

function equalHTML(fragment, html) {
  var div = document.createElement("div");
  div.appendChild(fragment.cloneNode(true));

  QUnit.push(div.innerHTML === html, div.innerHTML, html);
}

var dom = {
  createDocumentFragment: function () {
    return document.createDocumentFragment();
  },
  createElement: function (name) {
    return document.createElement(name);
  },
  appendText: function (element, string) {
    element.textContent = string;
  }
}

function fragmentFor(ast) {
  var fragmentOpcodeCompiler = new FragmentOpcodeCompiler(),
      fragmentCompiler = new FragmentCompiler();

  var tree = fragmentOpcodeCompiler.compile(ast);
  var templates = fragmentCompiler.compile(tree);

  return templates.fn(dom)({});
}

function hydrationOpcodesTreeFor(ast) {
  var hydration = new HydrationOpcodeCompiler(compileAST);
  return hydration.compile(ast);
}

module('fragment');

test('compiles a fragment', function () {
  var ast = preprocess("<div>{{foo}} bar {{baz}}</div>"),
      fragment = fragmentFor(ast);

  equalHTML(fragment, "<div> bar </div>");
});

test('hydrates a fragment with range mustaches', function () {
  var ast = preprocess("<div>{{foo \"foo\" 3 blah bar=baz ack=\"syn\"}} bar {{baz}}</div>");
  var fragment = fragmentFor(ast).cloneNode(true);
  var tree = hydrationOpcodesTreeFor(ast);

  var hydrate2 = new HydrationCompiler();
  var program = hydrate2.compile(tree);
  var mustaches = program.fn(Range)(fragment);

  equal(mustaches.length, 2);

  equal(mustaches[0][0], "foo");
  deepEqual(mustaches[0][1], ["foo",3,"blah"]);
  deepEqual(mustaches[0][2].types, ["string","number","id"]);
  deepEqual(mustaches[0][2].hash, {ack:"syn",bar:"baz"});
  deepEqual(mustaches[0][2].hashTypes, {ack:"string",bar:"id"});
  equal(mustaches[0][2].escaped, true);

  equal(mustaches[1][0], "baz");
  deepEqual(mustaches[1][1], []);
  equal(mustaches[1][2].escaped, true);

  mustaches[0][2].range.appendChild(document.createTextNode('A'));
  mustaches[1][2].range.appendChild(document.createTextNode('B'));

  equalHTML(fragment, "<div>A bar B</div>");
});

test('hydrates a fragment with range mustaches', function () {
  var ast = preprocess("<div>{{foo \"foo\" 3 blah bar=baz ack=\"syn\"}} bar {{baz}}</div>");
  var fragment = fragmentFor(ast).cloneNode(true);
  var tree = hydrationOpcodesTreeFor(ast);

  var hydrate2 = new HydrationCompiler();
  var program = hydrate2.compile(tree).fn(Range);
  var mustaches = program(fragment);

  equal(mustaches.length, 2);

  equal(mustaches[0][0], "foo");
  deepEqual(mustaches[0][1], ["foo",3,"blah"]);
  deepEqual(mustaches[0][2].types, ["string","number","id"]);
  deepEqual(mustaches[0][2].hash, {ack:"syn",bar:"baz"});
  deepEqual(mustaches[0][2].hashTypes, {ack:"string",bar:"id"});
  equal(mustaches[0][2].escaped, true);

  equal(mustaches[1][0], "baz");
  deepEqual(mustaches[1][1], []);
  equal(mustaches[1][2].escaped, true);

  mustaches[0][2].range.appendChild(document.createTextNode('A'));
  mustaches[1][2].range.appendChild(document.createTextNode('B'));

  equalHTML(fragment, "<div>A bar B</div>");
});

test('hydrates a fragment with range mustaches', function () {
  var ast = preprocess("<div {{foo}}></div>");
  var fragment = fragmentFor(ast).cloneNode(true);
  var tree = hydrationOpcodesTreeFor(ast);

  var hydrate2 = new HydrationCompiler();
  var program = hydrate2.compile(tree).fn(Range);
  var mustaches = program(fragment);

  equal(mustaches.length, 1);
  equal(mustaches[0][0], "foo");
  deepEqual(mustaches[0][1], []);
});
