import { TemplateCompiler } from "htmlbars-compiler/compiler/template";
import { Morph } from "morph";
import { preprocess } from "htmlbars-compiler/parser";
import { equalHTML } from "test/support/assertions";

module("TemplateCompiler");

var dom = {
  createDocumentFragment: function () {
    return document.createDocumentFragment();
  },
  createElement: function (name) {
    return document.createElement(name);
  },
  appendText: function (node, string) {
    node.appendChild(document.createTextNode(string));
  },
  createTextNode: function(string) {
    return document.createTextNode(string);
  }
};

var helpers = {
  CONTENT: function(morph, helperName, context, params, options, helpers) {
    if (helperName === 'if') {
      if (context[params[0]]) {
        options.helpers = helpers;
        morph.update(options.render(context, options));
      }
      return;
    }
    morph.update(context[helperName]);
  }
};

test("it works", function testFunction() {
  /* jshint evil: true */
  var ast = preprocess('<div>{{#if working}}Hello {{firstName}} {{lastName}}!{{/if}}</div>');
  var compiler = new TemplateCompiler();
  var program = compiler.compile(ast);
  var template = new Function("dom", "Morph", "return " + program)(dom, Morph);
  var frag = template(
    { working: true, firstName: 'Kris', lastName: 'Selden' },
    { helpers: helpers }
  );
  equalHTML(frag, '<div>Hello Kris Selden!</div>');
});

