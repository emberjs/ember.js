import { Fragment } from "htmlbars/compiler/fragment";
import { compileAST } from "htmlbars/compiler/compile";
import { HydrationCompiler } from "htmlbars/compiler/hydration";
import { Hydration2 } from "htmlbars/compiler/hydration2";
import { Compiler2 } from "htmlbars/compiler/pass2";
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
  var fragmentOpcodeCompiler = new Fragment(),
      fragmentCompiler = new Compiler2();

  fragmentOpcodeCompiler.compile(ast);
  var template = fragmentCompiler.compile(fragmentOpcodeCompiler.opcodes, {
    children: fragmentOpcodeCompiler.children
  })(dom);

  return template({});
}

function hydrationOpcodesFor(ast) {
  var hydration = new HydrationCompiler(compileAST);
  hydration.compile(ast);
  return hydration.opcodes;
}

module('fragment');

test('compiles a fragment', function () {
  var ast = preprocess("<div>{{foo}} bar {{baz}}</div>"),
      fragment = fragmentFor(ast);

  equalHTML(fragment, "<div> bar </div>");
});

test('hydrates a fragment', function () {
  var ast = preprocess("<div>{{foo \"foo\" 3 blah bar=baz ack=\"syn\"}} bar {{baz}}</div>");
  var fragment = fragmentFor(ast).cloneNode(true);
  var opcodes = hydrationOpcodesFor(ast);

  var hydrate2 = new Hydration2();
  var program = hydrate2.compile(opcodes)(Range);
  var mustaches = program(fragment);

  equal(mustaches.length, 2);

  equal(mustaches[0][0], "foo");
  deepEqual(mustaches[0][1], ["foo",3,["blah"]]);
  deepEqual(mustaches[0][2].types, ["string","number","id"]);
  deepEqual(mustaches[0][2].hash, {ack:"syn",bar:["baz"]});
  deepEqual(mustaches[0][2].hashTypes, {ack:"string",bar:"id"});
  equal(mustaches[0][2].escaped, true);

  equal(mustaches[1][0], "baz");
  deepEqual(mustaches[1][1], []);
  equal(mustaches[1][2].escaped, true);

  mustaches[0][2].range.appendChild(document.createTextNode('A'));
  mustaches[1][2].range.appendChild(document.createTextNode('B'));

  equalHTML(fragment, "<div>A bar B</div>");
});
