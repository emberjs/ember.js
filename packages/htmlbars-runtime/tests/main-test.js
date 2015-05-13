/*globals SVGElement, SVGLinearGradientElement */
import { hooks } from "../htmlbars-runtime";
import { manualElement } from "../htmlbars-runtime/render";
import { compile } from "../htmlbars-compiler/compiler";
import { hostBlock } from "../htmlbars-runtime/hooks";
import { equalTokens } from "../htmlbars-test-helpers";
import DOMHelper from "../dom-helper";

QUnit.module("htmlbars-runtime");

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
  var env = {
    dom: new DOMHelper(),
    hooks: hooks,
    helpers: {},
    partials: {},
    useFragmentCache: true
  };
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
