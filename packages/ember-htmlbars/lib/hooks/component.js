import { get } from "ember-metal/property_get";
import Ember from "ember-metal/core";
import { hooks as htmlbarsHooks } from "htmlbars-runtime";
import { validateChildMorphs } from "htmlbars-util";
import { readHash } from "ember-metal/streams/utils";
import { symbol } from "ember-metal/utils";
import merge from "ember-metal/merge";

export var componentClassSymbol = symbol("componentClass");
export var componentLayoutSymbol = symbol("componentLayout");
export var componentSymbol = symbol("component");

// my-button template
// <div class="bs-ui bs-button bs-active"><p>{{attrs.title}}</p>{{yield}}</div>
//
// app template
// <my-button title="Hello">world</my-button>
//
// <app-template>
//   <my-button> component
//     <range>world</range> (app-template scope)
//
// <my-button> shadow root (scope={ attrs: { title: "Hello" } })
//   <range>{{attrs.title}}</range>
//   <range>{{yield}}</range>

export default function componentHook(renderNode, env, scope, tagName, attrs, template, visitor) {
  var state = renderNode.state;
  // Determine if this is an initial render or a re-render
  if (state.componentNode) {
    state.componentNode.rerender(env, attrs, visitor, state.shouldRerender);
    state.shouldRerender = false;
    return;
  }

  var read = env.hooks.getValue;
  var parentView = read(env.view);
  var found;

  if (attrs[componentClassSymbol] || attrs[componentLayoutSymbol]) {
    found = {
      component: read(attrs[componentClassSymbol]),
      layout: read(attrs[componentLayoutSymbol])
    };
  }

  var componentNode = state.componentNode =
    ComponentNode.create(renderNode, env, found, parentView, tagName,
                         scope, template);

  componentNode.render(env, attrs, visitor, parentView._state === 'inDOM');
}

function ComponentNode(component, shadowRoot) {
  this.component = component;
  this.shadowRoot = shadowRoot;
}

ComponentNode.create = function(renderNode, env, found, parentView, tagName, contentScope, contentTemplate) {
  found = found || lookupComponent(env, tagName);
  Ember.assert("Could not find component '" + tagName + "' (no component or template with that name was found)", !!found.component || !!found.layout);

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

  this.shadowRoot.render(env, attrs, visitor);

  if (component) {
    if (inDOM) {
      component.renderer.didInsertElement(component);
    } else {
      // TODO: This should be on ownerNode, not ownerView
      component.ownerView.newlyCreated.push(component);
    }
  }
};

ComponentNode.prototype.rerender = function(env, attrs, visitor, shouldRerender) {
  var component = this.component;

  if (component) {
    var snapshot = readHash(attrs);

    if (shouldRerender) {
      env.renderer.updateAttrs(component, snapshot);
    }

    env.renderer.willUpdate(component, snapshot);
  }

  validateChildMorphs(this.shadowRoot.layoutMorph, visitor);
};

function ShadowRoot(layoutMorph, component, layoutTemplate, contentScope, contentTemplate) {
  this.layoutMorph = layoutMorph;
  this.layoutTemplate = layoutTemplate;
  this.hostComponent = component;

  this.contentScope = contentScope;
  this.contentTemplate = contentTemplate;
}

ShadowRoot.prototype.render = function(env, attrs, visitor) {
  if (!this.layoutTemplate) { return; }

  var self = { attrs: attrs };
  self[componentSymbol] = this.hostComponent || true;

  var hash = { self: self, layout: this.layoutTemplate };

  var newEnv = env;
  if (this.hostComponent) {
    newEnv = merge({}, env);
    newEnv.view = this.hostComponent;
  }

  // Invoke the `@view` helper. Tell it to render the layout template into the
  // layout morph. When the layout template `{{yield}}`s, it should render the
  // contentTemplate with the contentScope.
  htmlbarsHooks.block(this.layoutMorph, newEnv, this.contentScope, '@view',
                      [], hash, this.contentTemplate, null, visitor);
};

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
