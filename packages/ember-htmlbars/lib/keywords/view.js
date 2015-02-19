/**
@module ember
@submodule ember-htmlbars
*/

import { get } from "ember-metal/property_get";
import { read } from "ember-metal/streams/utils";
import Ember from "ember-metal/core";

export default function viewKeyword(morph, env, scope, params, hash, template, inverse) {
  var view = hash.view = read(params[0]).create();

  morph.state.view = view;
  view._transitionTo('inBuffer');

  Ember.assert("Expected morph to have only a single node", morph.firstNode === morph.lastNode);

  var dom = env.dom;

  var element = dom.createElement(tagNameFor(view));

  dom.setAttribute(element, 'id', view.elementId);
  dom.insertBefore(morph.firstNode.parentNode, element, morph.firstNode);

  if (get(view, 'template') || get(view, 'layout')) {
    dom.insertBefore(element, morph.firstNode, null);
    morph.contextualElement = element;

    env.hooks.block(morph, env, scope, '@view', params, hash, null, null);
  }

  view._transitionTo('hasElement');
  view._transitionTo('inDOM');
}

function tagNameFor(view) {
  var tagName = get(view, 'tagName');

  if (tagName === null || tagName === undefined) {
    tagName = 'div';
  }

  return tagName;
}
