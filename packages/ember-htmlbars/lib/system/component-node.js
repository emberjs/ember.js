import { get } from "ember-metal/property_get";
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
    layoutMorph = component.renderer.contentMorphForView(component, renderNode);
    layoutTemplate = get(component, 'layout') || get(component, 'template') || found.layout;
  } else {
    layoutMorph = renderNode;
    layoutTemplate = found.layout;
  }

  var shadowRoot = new ShadowRoot(layoutMorph, component, layoutTemplate,
                                  contentScope, contentTemplate);

  return new ComponentNode(component, shadowRoot);
};

ComponentNode.prototype.render = function(env, attrs, visitor, inDOM) {
  var component = this.component;

  if (component) {
    env.renderer.setAttrs(this.component, readHash(attrs));
  }

  var self = { attrs: attrs };

  this.shadowRoot.render(env, self, visitor);

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
  env = this.shadowRoot.rerender(env);
  var component = this.component;

  if (component) {
    var snapshot = readHash(attrs);

    if (component.renderNode.state.shouldReceiveAttrs) {
      env.renderer.updateAttrs(component, snapshot);
      component.renderNode.state.shouldReceiveAttrs = false;
    }

    // TODO: Trigger this on re-renders, even though the component will
    // not (atm) have been dirtied
    env.renderer.willUpdate(component, snapshot);
  }

  validateChildMorphs(env, this.shadowRoot.layoutMorph, visitor);

  return env;
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
