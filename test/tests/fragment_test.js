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

function hydrationFor(html, options) {
  var ast = preprocess(html, options),
      fragment = new Fragment(options),
      compiler2 = new Compiler2(options);
  fragment.compile(ast);
  var template = compiler2.compile(fragment.opcodes, {
    children: fragment.children
  })(dom);
  var hydration = new HydrationCompiler(compileAST, options);
  hydration.compile(ast);
  return {
    fragment: template({}),
    opcodes: hydration.opcodes
  };
}

module('fragment');

test('compiles a fragment', function () {
  var hydration = hydrationFor("<div>{{foo}} bar {{baz}}</div>");

  equalHTML(hydration.fragment, "<div> bar </div>");
});

test('hydrates a fragment', function () {
  var hydration = hydrationFor("<div>{{foo blah bar=baz}} bar {{baz}}</div>");
  var clone = hydration.fragment.cloneNode(true);
  var hydrate2 = new Hydration2();
  var program = hydrate2.compile(hydration.opcodes)(Range);
  var mustaches = program(clone);

  equal(mustaches.length, 2);

  mustaches[0].range.appendChild(document.createTextNode('A'));
  mustaches[1].range.appendChild(document.createTextNode('B'));

  equalHTML(clone, "<div>A bar B</div>");
});
