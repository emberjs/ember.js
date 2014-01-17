import { FragmentOpcodeCompiler } from "htmlbars/compiler/fragment_opcode";
import { HydrationOpcodeCompiler } from "htmlbars/compiler/hydration_opcode";
import { FragmentCompiler } from "htmlbars/compiler/fragment";
import { HydrationCompiler } from "htmlbars/compiler/hydration";
import { domHelpers } from "htmlbars/runtime/dom_helpers";
import { Range } from "htmlbars/runtime/range";
import { preprocess } from "htmlbars/parser";

function equalHTML(fragment, html) {
  var div = document.createElement("div");
  div.appendChild(fragment.cloneNode(true));

  QUnit.push(div.innerHTML === html, div.innerHTML, html);
}

var dom = domHelpers();

function fragmentFor(ast) {
  var fragmentOpcodeCompiler = new FragmentOpcodeCompiler(),
      fragmentCompiler = new FragmentCompiler();

  var opcodes = fragmentOpcodeCompiler.compile(ast);
  var program = fragmentCompiler.compile(opcodes);

  var fn = new Function("dom", 'return ' + program)(dom);

  return fn();
}

function hydrationOpcodes(ast) {
  var hydration = new HydrationOpcodeCompiler();
  return hydration.compile(ast);
}

function hydrationFor(ast) {
  var hydrate = new HydrationOpcodeCompiler();
  var opcodes = hydrate.compile(ast);
  var hydrate2 = new HydrationCompiler();
  var program = hydrate2.compile(opcodes, []);
  return new Function("Range", 'return '+program)(Range);
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
  var hydrate = hydrationFor(ast);
  var mustaches = hydrate(fragment);

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
  var hydrate = hydrationFor(ast);
  var mustaches = hydrate(fragment);

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
  var hydrate = hydrationFor(ast);
  var mustaches = hydrate(fragment);

  equal(mustaches.length, 1);
  equal(mustaches[0][0], "foo");
  deepEqual(mustaches[0][1], []);
});

test('test auto insertion of text nodes for needed edges a fragment with range mustaches', function () {
  var ast = preprocess("{{first}}<p>{{second}}</p>{{third}}");
  var fragment = fragmentFor(ast).cloneNode(true);
  var hydrate = hydrationFor(ast);
  var mustaches = hydrate(fragment);

  equal(mustaches.length, 3);
  equal(mustaches[0][0], "first");
  deepEqual(mustaches[0][1], []);
  equal(mustaches[1][0], "second");
  deepEqual(mustaches[1][1], []);
  equal(mustaches[2][0], "third");
  deepEqual(mustaches[2][1], []);


  mustaches[0][2].range.appendText('A');
  mustaches[1][2].range.appendText('B');
  mustaches[2][2].range.appendText('C');

  equalHTML(fragment, "A<p>B</p>C");
});
