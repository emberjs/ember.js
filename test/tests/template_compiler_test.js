import { TemplateCompiler } from "htmlbars/compiler/template";
import { Placeholder } from "htmlbars/runtime/placeholder";
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
};

var helpers = {
  CONTENT: function(placeholder, helperName, context, params, options, helpers) {
    if (helperName === 'if') {
      if (context[params[0]]) {
        options.helpers = helpers;
        placeholder.appendChild(
          options.render(context, options)
        );
      }
      return;
    }
    placeholder.appendText(context[helperName]);
  }
};

test("it works", function testFunction() {
  /* jshint evil: true */
  var ast = preprocess('<div>{{#if working}}Hello {{firstName}} {{lastName}}!{{/if}}</div>');
  var compiler = new TemplateCompiler();
  var program = compiler.compile(ast);
  var template = new Function("dom", "Placeholder", "return " + program)(dom, Placeholder);
  var frag = template(
    { working: true, firstName: 'Kris', lastName: 'Selden' },
    { helpers: helpers }
  );
  equalHTML(frag, '<div>Hello Kris Selden!</div>');
});

