import { Fragment } from "htmlbars/compiler/fragment";
import { compileAST } from "htmlbars/compiler/compile";
import { HydrationCompiler } from "htmlbars/compiler/hydration";
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

function hydrate(fragment, opcodes) {
  var ranges = [];
  opcodes.forEach(function (opcode) {
    var parentPath,
        startIndex,
        endIndex,
        parent,
        start,
        end;
    switch (opcode.type) {
      case "helper":
        parentPath = opcode.params[3];
        startIndex = opcode.params[4];
        endIndex = opcode.params[5];
        break;
      case "ambiguous":
        parentPath = opcode.params[2];
        startIndex = opcode.params[3];
        endIndex = opcode.params[4];
        break;
      default:
        return;
    }
    var parent = fragment;
    for (var i=0, l=parentPath.length; i<l; i++) {
      parent = parent.childNodes[parentPath[i]];
    }
    start = startIndex === null ? null : parent.childNodes[startIndex];
    end =   endIndex   === null ? null : parent.childNodes[endIndex];
    ranges.push(new Range(parent, start, end));
  });
  return ranges;
}

module('fragment');

test('compiles a fragment', function () {
  var hydration = hydrationFor("<div>{{foo}} bar {{baz}}</div>");
  var clone = hydration.fragment.cloneNode(true);
  var ranges = hydrate(clone, hydration.opcodes);

  equalHTML(clone, "<div> bar </div>");

  equal(ranges.length, 2);

  ranges[0].appendChild(document.createTextNode('A'));
  ranges[1].appendChild(document.createTextNode('B'));

  equalHTML(clone, "<div>A bar B</div>");
});
