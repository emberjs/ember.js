import { TemplateCompiler } from "../htmlbars-compiler/compiler/template";
import { preprocess } from "../htmlbars-compiler/parser";
import { equalHTML } from "../htmlbars-test-helpers";
import defaultHooks from "../htmlbars-runtime/hooks";
import defaultHelpers from "../htmlbars-runtime/helpers";
import { merge } from "../htmlbars-runtime/utils";
import { DOMHelper } from "../morph";

QUnit.module("TemplateCompiler");

var dom, hooks, helpers;

test("it works", function testFunction() {
  /* jshint evil: true */
  var ast = preprocess('<div>{{#if working}}Hello {{firstName}} {{lastName}}!{{/if}}</div>');
  var compiler = new TemplateCompiler();
  var program = compiler.compile(ast);
  var template = new Function("return " + program)();

  dom = new DOMHelper();
  hooks = merge({}, defaultHooks);
  helpers = merge({}, defaultHelpers);
  
  var env = {
    dom: dom,
    hooks: hooks,
    helpers: helpers 
  };

  env.helpers['if'] = function(params, hash, options) {
    if (params[0]) {
      return options.render(context, env, options.morph.contextualElement);
    }
  };

  var context = {
    working: true,
    firstName: 'Kris',
    lastName: 'Selden'
  };
  var frag = template(context, env, document.body);
  equalHTML(frag, '<div>Hello Kris Selden!</div>');
});

