import TemplateCompiler from "../htmlbars-compiler/template-compiler";
import { preprocess } from "../htmlbars-syntax/parser";
import { equalHTML } from "../htmlbars-test-helpers";
import defaultHooks from "../htmlbars-runtime/hooks";
import defaultHelpers from "../htmlbars-runtime/helpers";
import { merge } from "../htmlbars-util/object-utils";
import DOMHelper from "../dom-helper";

QUnit.module("TemplateCompiler");

var dom, hooks, helpers;

function countNamespaceChanges(template) {
  var ast = preprocess(template);
  var compiler = new TemplateCompiler();
  var program = compiler.compile(ast);
  var matches = program.match(/dom\.setNamespace/g);
  return matches ? matches.length : 0;
}

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
      return options.template.render(context, env, options.morph.contextualElement);
    }
  };

  var context = {
    working: true,
    firstName: 'Kris',
    lastName: 'Selden'
  };
  var frag = template.render(context, env, document.body);
  equalHTML(frag, '<div>Hello Kris Selden!</div>');
});

test("it omits unnecessary namespace changes", function () {
  equal(countNamespaceChanges('<div></div>'), 0);  // sanity check
  equal(countNamespaceChanges('<div><svg></svg></div><svg></svg>'), 1);
  equal(countNamespaceChanges('<div><svg></svg></div><div></div>'), 2);
  equal(countNamespaceChanges('<div><svg><title>foobar</title></svg></div><svg></svg>'), 1);
  equal(countNamespaceChanges('<div><svg><title><h1>foobar</h1></title></svg></div><svg></svg>'), 3);
});

test('it adds the provided revision to the template', function () {
  var ast = preprocess('{{foo}}');
  var compiler = new TemplateCompiler({
    revision: 'FOO.BAR'
  });
  var program = compiler.compile(ast);

  ok(program.indexOf('revision: "FOO.BAR"') > -1);
});
