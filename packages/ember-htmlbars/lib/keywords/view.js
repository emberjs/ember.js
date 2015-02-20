/**
@module ember
@submodule ember-htmlbars
*/

import { get } from "ember-metal/property_get";
import { readViewFactory } from "ember-views/streams/utils";
import Ember from "ember-metal/core";
import EmberView from "ember-views/views/view";

export default function viewKeyword(morph, env, scope, params, hash, template, inverse) {
  var read = env.hooks.getValue;
  var parentView = read(scope.locals.view);
  var view = hash.view = getView(read(params[0]), parentView.container);
  parentView.linkChild(view);

  morph.state.view = view;

  Ember.assert("Expected morph to have only a single node", morph.firstNode === morph.lastNode);

  var dom = env.dom;

  var contentMorph = view.renderer.contentMorphForView(view, morph, dom);

  var viewHasTemplate = get(view, 'template') || get(view, 'layout') || template;
  var inDOM = parentView._state === 'inDOM';

  if (viewHasTemplate) {
    env.hooks.block(contentMorph, env, scope, '@view', params, hash, template, null);
  }

  view.renderer.didCreateElement(view);

  if (inDOM) {
    view._transitionTo('inDOM');
  } else {
    view.ownerView.newlyCreated.push(view);
  }
}

function getView(viewPath, container) {
  var viewClassOrInstance;

  if (!viewPath) {
    if (container) {
      viewClassOrInstance = container.lookupFactory('view:toplevel');
    } else {
      viewClassOrInstance = EmberView;
    }
  } else {
    viewClassOrInstance = readViewFactory(viewPath, container);
  }

  if (viewClassOrInstance instanceof EmberView) {
    return viewClassOrInstance;
  } else {
    return viewClassOrInstance.create();
  }
}
