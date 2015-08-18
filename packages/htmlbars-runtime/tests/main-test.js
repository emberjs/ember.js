/*globals SVGElement, SVGLinearGradientElement */
import { hooks } from "../htmlbars-runtime";
import { manualElement } from "../htmlbars-runtime/render";
import { compile } from "../htmlbars-compiler/compiler";
import { hostBlock } from "../htmlbars-runtime/hooks";
import { equalTokens } from "../htmlbars-test-helpers";
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

QUnit.skip("manualElement function honors namespaces", function() {
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
