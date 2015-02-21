import { get } from "ember-metal/property_get";
import Ember from "ember-metal/core";
import { hooks as htmlbarsHooks } from "htmlbars-runtime";
import { readHash } from "ember-metal/streams/utils";

export default function componentHook(morph, env, scope, tagName, attrs, template) {
  var component;

  if (morph.state.didRenderComponent) {
    component = morph.state.renderedComponent;

    if (component) {
      var snapshot = readHash(attrs);
      if (component.willReceiveAttrs) { component.willReceiveAttrs(snapshot); }
      component.attrs = readHash(attrs);
    }

    return;
  }

  var read = env.hooks.getValue;
  var container = env.container;
  var componentLookup = container.lookup('component-lookup:main');
  var parentView = read(scope.locals.view);

  var foundComponent = componentLookup.componentFor(tagName, container);
  var foundLayout = componentLookup.layoutFor(tagName, container);
  var contentMorph;
  var layout;
  var self;

  Ember.assert("Could not find component '" + tagName + "' (no component or template with that name was found)", !!foundComponent || !!foundLayout);

  if (foundComponent) {
    component = foundComponent.create();
    parentView.linkChild(component);
    morph.state.view = component;

    contentMorph = component.renderer.contentMorphForView(component, morph);
    self = component;
    layout = get(component, 'layout') || foundLayout;
  } else {
    contentMorph = morph;
    layout = foundLayout;
  }

  if (layout) {
    var viewHash = { self:
      { '*component*': component || true, attrs: attrs }, layout: layout };
    htmlbarsHooks.block(contentMorph, env, scope, '@view', [], viewHash, template, null);
  }

  if (component) {
    component.attrs = readHash(attrs);

    if (parentView._state === 'inDOM') {
      // TODO: Make sure this gets called once all descendents are also in DOM
      component.renderer.didInsertElement(component);
    } else {
      component.ownerView.newlyCreated.push(component);
    }
    component.renderNode = morph;
    morph.state.renderedComponent = component;
  }

  morph.state.didRenderComponent = true;
}
