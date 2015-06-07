/*globals SVGElement, SVGLinearGradientElement */
import { hooks } from "../htmlbars-runtime";
import render from "../htmlbars-runtime/render";
import { manualElement, attachAttributes } from "../htmlbars-runtime/render";
import { compile } from "../htmlbars-compiler/compiler";
import { hostBlock, wrap } from "../htmlbars-runtime/hooks";
import { equalTokens } from "../htmlbars-test-helpers";
import { clearMorph, blockFor } from "../htmlbars-util/template-utils";
import DOMHelper from "../dom-helper";

let env;

QUnit.module("htmlbars-runtime", {
  setup() {
    env = {
      dom: new DOMHelper(),
      hooks: hooks,
      helpers: {},
      partials: {},
      useFragmentCache: true
    };
  }
});

function keys(obj) {
  var ownKeys = [];
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      ownKeys.push(key);
    }
  }
  return ownKeys;
}

test("hooks are present", function () {
  var hookNames = [
    "keywords",
    "linkRenderNode",
    "createScope",
    "classify",
    "createFreshScope",
    "createChildScope",
    "bindShadowScope",
    "bindScope",
    "bindSelf",
    "bindLocal",
    "bindBlock",
    "updateScope",
    "updateSelf",
    "updateLocal",
    "lookupHelper",
    "hasHelper",
    "invokeHelper",
    "range",
    "block",
    "inline",
    "keyword",
    "partial",
    "component",
    "element",
    "attribute",
    "subexpr",
    "concat",
    "get",
    "getRoot",
    "getChild",
    "getValue",
    "cleanupRenderNode",
    "destroyRenderNode",
    "willCleanupTree",
    "didCleanupTree",
    "getCellOrValue",
    "didRenderNode",
    "willRenderNode"
  ];

  for (var i = 0; i < hookNames.length; i++) {
    var hook = hooks[hookNames[i]];
    ok(hook !== undefined, "hook " + hookNames[i] + " is present");
  }

  equal(keys(hooks).length, hookNames.length, "Hooks length match");
});

test("manualElement function honors namespaces", function() {
  hooks.keywords['manual-element'] = {
      render: function(morph, env, scope, params, hash, template, inverse, visitor) {
        var attributes = {
          version: '1.1'
        };

        var layout = manualElement('svg', attributes);

        hostBlock(morph, env, scope, template, inverse, null, visitor, function(options) {
          options.templates.template.yieldIn({ raw: layout }, hash);
        });

        manualElement(env, scope, 'span', attributes, morph);
      },

      isStable: function() { return true; }
    };

    var template = compile('{{#manual-element}}<linearGradient><stop offset="{{startOffset}}"></stop><stop offset="{{stopOffset}}"></stop></linearGradient>{{/manual-element}}');
    var result = template.render({startOffset:0.1, stopOffset:0.6}, env);
    ok(result.fragment.childNodes[1] instanceof SVGElement);
    ok(result.fragment.childNodes[1].childNodes[0] instanceof SVGLinearGradientElement);
    equalTokens(result.fragment, '<svg version="1.1"><linearGradient><stop offset="0.1"></stop><stop offset="0.6"></stop></linearGradient></svg>');
});

test("manualElement function honors void elements", function() {
  var attributes = {
    class: 'foo-bar'
  };
  var layout = manualElement('input', attributes);
  var fragment = layout.buildFragment(new DOMHelper());

  equal(fragment.childNodes.length, 1, 'includes a single element');
  equal(fragment.childNodes[0].childNodes.length, 0, 'no child nodes were added to `<input>` because it is a void tag');
  equalTokens(fragment, '<input class="foo-bar">');
});

test("attachAttributes function attaches attributes to an existing element", function() {
  var attributes = {
    class: 'foo-bar',
    other: ['get', 'other']
  };

  var element = document.createElement('div');
  let raw = attachAttributes(attributes);
  raw.element = element;

  let template = wrap(raw);

  let self = { other: "first" };
  let result = template.render(self, env);

  equal(element.getAttribute('class'), "foo-bar", "the attribute was assigned");
  equal(element.getAttribute('other'), "first", "the attribute was assigned");

  self.other = "second";
  result.rerender();

  equal(element.getAttribute('class'), "foo-bar", "the attribute was assigned");
  equal(element.getAttribute('other'), "second", "the attribute was assigned");
});

test("the 'attributes' statement attaches an attributes template to a parent", function() {
  env.hooks.attributes = function(morph, env, scope, template, parentNode, visitor) {
    let block = morph.state.block;

    if (!block) {
      let element = parentNode.firstNode;
      template.element = element;
      block = morph.state.block = blockFor(render, template, { scope: scope });
    }

    block(env, [], undefined, morph, undefined, visitor);
  };

  let cleanedUpNodes = [];
  env.hooks.cleanupRenderNode = function(node) {
    cleanedUpNodes.push(node);
  };

  var attributes = {
    class: 'foo-bar',
    other: ['get', 'other']
  };

  let template = compile("<div>hello</div>");

  let self = { other: "first" };
  let result = template.render(self, env, { attributes });
  let attributesMorph = result.nodes[result.nodes.length - 1];

  equalTokens(result.fragment, "<div class='foo-bar' other='first'>hello</div>");

  self.other = "second";
  result.rerender();

  equalTokens(result.fragment, "<div class='foo-bar' other='second'>hello</div>");

  let expected = [result.root, attributesMorph, attributesMorph.childNodes[0]];
  clearMorph(result.root, env, true);

  deepEqual(cleanedUpNodes, expected);
});
