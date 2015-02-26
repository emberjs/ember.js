import { get } from "ember-metal/property_get";
import merge from "ember-metal/merge";
import Ember from "ember-metal/core";
import { validateChildMorphs } from "htmlbars-util";
import { readHash } from "ember-metal/streams/utils";

import ShadowRoot from "ember-htmlbars/system/shadow-root";

function ComponentNode(component, shadowRoot) {
  this.component = component;
  this.shadowRoot = shadowRoot;
}

export default ComponentNode;

ComponentNode.create = function(renderNode, env, found, parentView, tagName, contentScope, contentTemplate) {
  found = found || lookupComponent(env, tagName);
  Ember.assert("Could not find component '" + tagName + "' (no component or template with that name was found)", !!found.component || !!found.layout || contentTemplate);

  var component, layoutMorph, layoutTemplate;

  if (found.component) {
    component = createComponent(found.component, parentView, renderNode);
    component.renderNode = renderNode;
    renderNode.state.component = component;
    layoutMorph = component.renderer.contentMorphForView(component, renderNode);
    layoutTemplate = get(component, 'layout') || get(component, 'template') || found.layout;
  } else {
    layoutMorph = renderNode;
    layoutTemplate = found.layout;
  }

  var shadowRoot = new ShadowRoot(layoutMorph, layoutTemplate, contentScope, contentTemplate);
  return new ComponentNode(component, shadowRoot);
};

ComponentNode.prototype.render = function(env, attrs, visitor, inDOM) {
  var component = this.component;

  if (component) {
    env.renderer.setAttrs(this.component, readHash(attrs));
  }

  var self = { attrs: attrs };

  var newEnv = env;
  if (this.component) {
    newEnv = merge({}, env);
    newEnv.view = this.component;
  }

  var options = {
    view: this.component,
    renderNode: this.component && this.component.renderNode
  };

  this.shadowRoot.render(newEnv, self, options, visitor);

  if (component) {
    if (inDOM) {
      component.renderer.didInsertElement(component);
    } else {
      // TODO: This should be on ownerNode, not ownerView
      component.ownerView.newlyCreated.push(component);
    }
  }
};

ComponentNode.prototype.rerender = function(env, attrs, visitor) {
  var newEnv = env;
  if (this.component) {
    newEnv = merge({}, env);
    newEnv.view = this.component;
  }

  var component = this.component;

  if (component) {
    var snapshot = readHash(attrs);

    if (component.renderNode.state.shouldReceiveAttrs) {
      newEnv.renderer.updateAttrs(component, snapshot);
      component.renderNode.state.shouldReceiveAttrs = false;
    }

    // TODO: Trigger this on re-renders, even though the component will
    // not (atm) have been dirtied
    newEnv.renderer.willUpdate(component, snapshot);
  }

  validateChildMorphs(newEnv, this.shadowRoot.layoutMorph, visitor);

  return newEnv;
};

function lookupComponent(env, tagName) {
  var container = env.container;
  var componentLookup = container.lookup('component-lookup:main');

  return {
    component: componentLookup.componentFor(tagName, container),
    layout: componentLookup.layoutFor(tagName, container)
  };
}

function createComponent(component, parentView, morph) {
  if (component.create) {
    component = component.create();
  }

  parentView.linkChild(component);
  morph.state.view = component;
  return component;
}
