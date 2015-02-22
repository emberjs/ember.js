import { get } from "ember-metal/property_get";
import Ember from "ember-metal/core";
import { hooks as htmlbarsHooks, validateChildMorphs } from "htmlbars-runtime";
import { readHash } from "ember-metal/streams/utils";

export default function componentHook(morph, env, scope, tagName, attrs, template, visitor) {
  // Determine if this is an initial render or a re-render
  if (morph.state.didRenderComponent) {
    return rerender(morph, env, attrs, visitor);
  }

  var parentView = env.hooks.getValue(scope.locals.view);

  var found = lookupComponent(env, tagName);
  Ember.assert("Could not find component '" + tagName + "' (no component or template with that name was found)", !!found.component || !!found.layout);

  var shadowRoot = createShadowRoot(morph, found, parentView);
  var component = shadowRoot.component;

  if (component) {
    env.renderer.setAttrs(component, readHash(attrs));
  }

  // This won't be true for a template-less component (like `<input>`)
  if (shadowRoot.layout) {
    morph.state.shadowRootMorph = shadowRoot.contentMorph;
    renderShadowRoot(env, scope, shadowRoot, attrs, template, visitor);
  }

  if (component) {
    if (parentView._state === 'inDOM') {
      component.renderer.didInsertElement(component);
    } else {
      // TODO: This should be on ownerNode, not ownerView
      component.ownerView.newlyCreated.push(component);
    }
    component.renderNode = morph;
    morph.state.renderedComponent = component;
  }

  morph.state.didRenderComponent = true;
}

// TODO: This whole section of code should really be refactored into a single object
function createComponent(foundComponent, parentView, morph) {
  var component = foundComponent.create();
  parentView.linkChild(component);
  morph.state.view = component;
  return component;
}

function lookupComponent(env, tagName) {
  var container = env.container;
  var componentLookup = container.lookup('component-lookup:main');

  return {
    component: componentLookup.componentFor(tagName, container),
    layout: componentLookup.layoutFor(tagName, container)
  };
}

function createShadowRoot(morph, found, parentView) {
  var component, contentMorph, layout, self;

  if (found.component) {
    component = createComponent(found.component, parentView, morph);
    contentMorph = component.renderer.contentMorphForView(component, morph);
    self = component;
    layout = get(component, 'layout') || found.layout;
  } else {
    contentMorph = morph;
    layout = found.layout;
  }

  return { component: component, contentMorph: contentMorph, self: self, layout: layout };
}

function renderShadowRoot(env, scope, shadowRoot, attrs, template, visitor) {
  var viewHash = {
    self: { '*component*': shadowRoot.component || true, attrs: attrs },
    layout: shadowRoot.layout
  };

  htmlbarsHooks.block(shadowRoot.contentMorph, env, scope, '@view', [], viewHash, template, null, visitor);
}

function rerender(morph, env, attrs, visitor) {
  var component = morph.state.renderedComponent;

  if (component) {
    var snapshot = readHash(attrs);

    if (morph.state.shouldRerender) {
      morph.state.shouldRerender = false;
      env.renderer.updateAttrs(component, snapshot);
    }

    env.renderer.willUpdate(component, snapshot);
  }

  validateChildMorphs(morph, visitor);

  if (morph.state.shadowRootMorph) {
    validateChildMorphs(morph.state.shadowRootMorph, visitor);
  }
}
