import { compile } from "../htmlbars-compiler/compiler";
import defaultHooks from "../htmlbars-runtime/hooks";
import { merge } from "../htmlbars-util/object-utils";
import DOMHelper from "../dom-helper";
import { equalTokens } from "../htmlbars-test-helpers";

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

  registerHelper('each', function(params) {
    var list = params[0];

    for (var i=0, l=list.length; i<l; i++) {
      var item = list[i];
      if (this.arity > 0) {
        this.yieldItem(item.key, [item]);
      }
    }
  });

}

QUnit.module("Diffing", {
  beforeEach: commonSetup
});

test("Morph order is preserved when rerendering with duplicate keys", function() {
  var template = compile(`<ul>{{#each items as |item|}}<li>{{item.name}}</li>{{/each}}</ul>`);

  let a1 = { key: "a", name: "A1" };
  let a2 = { key: "a", name: "A2" };
  let b1 = { key: "b", name: "B1" };
  let b2 = { key: "b", name: "B2" };

  var result = template.render({ items: [a1, a2, b1, b2] }, env);
  equalTokens(result.fragment, `<ul><li>A1</li><li>A2</li><li>B1</li><li>B2</li></ul>`);

  let morph = result.nodes[0].morphList.firstChildMorph;
  morph.state.initialName = 'A1';
  morph.nextMorph.state.initialName = 'A2';
  morph.nextMorph.nextMorph.state.initialName = 'B1';
  morph.nextMorph.nextMorph.nextMorph.state.initialName = 'B2';

  function getNames() {
    let names = [];
    let morph = result.nodes[0].morphList.firstChildMorph;

    while (morph) {
      names.push(morph.state.initialName);
      morph = morph.nextMorph;
    }

    return names;
  }

  result.rerender(env, { items: [a1, b2, b1, a2] });

  equalTokens(result.fragment, `<ul><li>A1</li><li>B2</li><li>B1</li><li>A2</li></ul>`);
  deepEqual(getNames(), ['A1', 'B1', 'B2', 'A2']);

  result.rerender(env, { items: [b1, a2] });

  equalTokens(result.fragment, `<ul><li>B1</li><li>A2</li></ul>`);
  deepEqual(getNames(), ['B1', 'A1']);
});
