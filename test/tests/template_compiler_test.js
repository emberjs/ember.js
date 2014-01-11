import { TemplateCompiler } from "htmlbars/compiler/template";
import { Range } from "htmlbars/runtime/range";
import { preprocess } from "htmlbars/parser";

module("TemplateCompiler");

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
  appendText: function (node, string) {
    node.appendChild(document.createTextNode(string));
  }
}

var helpers = {
  RESOLVE: function (context, name, params, options) {
    if (options.helpers[name]) {
      options.helpers[name](context, params, options);
    } else {
      options.range.appendText(context[name]);
    }
  },
  'if': function (context, params, options) {
    if (context[params[0]]) {
      options.range.appendChild(
        options.render(context, options)
      );
    }
  }
};

test("it works", function testFunction() {
  var ast = preprocess('<div>{{#if working}}Hello {{firstName}} {{lastName}}!{{/if}}</div>')
  var compiler = new TemplateCompiler()
  var program = compiler.compile(ast);
  var template = new Function("dom", "Range", "return " + program)(dom, Range);
  var frag = template(
    { working: true, firstName: 'Kris', lastName: 'Selden' },
    { helpers: helpers }
  );
  equalHTML(frag, '<div>Hello Kris Selden!</div>')
});
