import { DOMHelper } from "htmlbars-runtime";
import { merge } from "htmlbars-util";
// import { manualElement } from "../htmlbars-runtime/render";
import { compile } from "htmlbars-compiler";
// import { hostBlock } from "../htmlbars-runtime/hooks";
import { equalTokens } from "htmlbars-test-helpers";

var hooks, helpers, partials, env;

function registerHelper(name, callback) {
  helpers[name] = callback;
}

function commonSetup() {
  hooks = merge({}, defaultHooks);
  hooks.keywords = merge({}, defaultHooks.keywords);
  helpers = {};
  partials = {};

  env = {
    dom: new DOMHelper(),
    hooks: hooks,
    helpers: helpers,
    partials: partials,
    useFragmentCache: true
  };
}

QUnit.module("htmlbars-runtime: hooks", {
  beforeEach: commonSetup
});

test("inline hook correctly handles false-like values", function() {

  registerHelper('get', function(params) {
    return params[0];
  });

  var object = { val: 'hello' };
  var template = compile('<div>{{get val}}</div>');
  var result = template.render(object, env);

  equalTokens(result.fragment, '<div>hello</div>');

  object.val = '';

  result.rerender();

  equalTokens(result.fragment, '<div></div>');

});

test("inline hook correctly handles false-like values", function() {

  registerHelper('get', function(params) {
    return params[0];
  });

  var object = { val: 'hello' };
  var template = compile('<div>{{get val}}</div>');
  var result = template.render(object, env);

  equalTokens(result.fragment, '<div>hello</div>');

  object.val = '';

  result.rerender();

  equalTokens(result.fragment, '<div></div>');

});

test("createChildScope hook creates a new object for `blocks`", function() {
  let scope = env.hooks.createFreshScope();
  let child = env.hooks.createChildScope(scope);

  let parentBlock = function() {};
  env.hooks.bindBlock(env, scope, parentBlock, 'inherited');
  strictEqual(scope.blocks.inherited, parentBlock);
  strictEqual(child.blocks.inherited, parentBlock);

  let childBlock = function() {};
  env.hooks.bindBlock(env, child, childBlock, 'notInherited');
  strictEqual(scope.blocks.notInherited, undefined);
  strictEqual(child.blocks.notInherited, childBlock);
});
