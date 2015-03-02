import { get } from "ember-metal/property_get";
import merge from "ember-metal/merge";
import Ember from "ember-metal/core";
import { readHash } from "ember-metal/streams/utils";
import { internal, render } from "htmlbars-runtime";

function ComponentNode(component, scope, renderNode, block, expectElement) {
  this.component = component;
  this.scope = scope;
  this.renderNode = renderNode;
  this.block = block;
  this.expectElement = expectElement;
}

export default ComponentNode;

ComponentNode.create = function(renderNode, env, attrs, found, parentView, path, contentScope, contentTemplate, visitor) {
  found = found || lookupComponent(env, path);
  Ember.assert('HTMLBars error: Could not find component named "' + path + '" (no component or template with that name was found)', function() {
    if (path) {
      return found.component || found.layout;
    } else {
      return found.component || found.layout || contentTemplate;
    }
  });

  var component, layoutTemplate, contentBlock, blockToRender;
  var createdElementBlock = false;

  if (found.component) {
    component = createComponent(env, found.component, parentView, renderNode);
    var tagName = tagNameFor(component);

    layoutTemplate = get(component, 'layout') || found.layout;

    component.renderNode = renderNode;
    renderNode.state.component = component;

    var layoutBlock;

    if (contentTemplate) {
      contentBlock = internal.blockFor(render, contentTemplate, {
        scope: contentScope,
        options: { view: component }
      });
    } else {
      contentBlock = function() {};
    }

    if (layoutTemplate) {
      layoutBlock = internal.blockFor(render, layoutTemplate.raw, {
        yieldTo: contentBlock,
        self: {},
        options: { view: component, attrs: attrs }
      });
    }

    if (tagName !== '') {
      var attributes = normalizeComponentAttributes(env, component, attrs);
      var elementTemplate = internal.manualElement(tagName, attributes);

      createdElementBlock = true;

      blockToRender = internal.blockFor(render, elementTemplate, {
        yieldTo: layoutBlock || contentBlock,
        self: { view: component },
        options: { view: component }
      });
    } else {
      blockToRender = layoutBlock || contentBlock;
    }
  } else {
    contentBlock = internal.blockFor(render, contentTemplate, { scope: contentScope });

    blockToRender = internal.blockFor(render, found.layout.raw, {
      yieldTo: contentBlock,
      self: {},
      options: { view: component, attrs: attrs }
    });
  }

  return new ComponentNode(component, contentScope, renderNode, blockToRender, createdElementBlock);
  //var shadowRoot = new ShadowRoot(layoutMorph, layoutTemplate, contentScope, contentTemplate);
  //return new ComponentNode(component, shadowRoot);
};

ComponentNode.prototype.render = function(env, attrs, visitor) {
  var component = this.component;

  if (component) {
    env.renderer.setAttrs(this.component, readHash(attrs));
  }

  var newEnv = env;
  if (this.component) {
    newEnv = merge({}, env);
    newEnv.view = this.component;
  }

  this.block(newEnv, [], this.renderNode, this.scope, visitor);

  env.renderer.didCreateElement(component, this.expectElement && this.renderNode.firstNode);

  if (component) {
    env.lifecycleHooks.push({ type: 'didInsertElement', view: component });
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

    // Notify component that it has become dirty and is about to change.
    env.renderer.willUpdate(component, snapshot);
    env.renderer.willRender(component);

    if (component.renderNode.state.shouldReceiveAttrs) {
      env.renderer.updateAttrs(component, snapshot);
      component.renderNode.state.shouldReceiveAttrs = false;
    }
  }

  this.block(newEnv, [], this.renderNode, this.scope, visitor);

  if (component) {
    env.lifecycleHooks.push({ type: 'didUpdate', view: component });
  }

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

function createComponent(env, component, parentView, morph) {
  if (component.create) {
    component = component.create();
  }
  env.renderer.willRender(component);

  parentView.linkChild(component);
  morph.state.view = component;
  return component;
}

// Takes a component and builds a normalized set of attribute
// bindings consumable by HTMLBars' `attribute` hook.
function normalizeComponentAttributes(env, component, attrs) {
  var normalized = {};
  var attributeBindings = component.attributeBindings;
  var i, l;

  if (attributeBindings) {
    for (i=0, l=attributeBindings.length; i<l; i++) {
      var attr = attributeBindings[i];
      var microsyntax = attr.split(':');

      if (microsyntax[1]) {
        normalized[microsyntax[1]] = ['get', 'view.' + microsyntax[0]];
      } else if (attrs[attr]) {
        normalized[attr] = ['value', attrs[attr]];
      } else {
        normalized[attr] = ['get', 'view.' + attr];
      }
    }
  }

  if (attrs.id) {
    // Do not allow binding to the `id`
    normalized.id = env.hooks.getValue(attrs.id);
  } else {
    normalized.id = component.elementId;
  }

  var normalizedClass = normalizeClass(component, attrs.class);

  if (normalizedClass) {
    normalized.class = normalizedClass;
  }

  return normalized;
}

function normalizeClass(component, classAttr) {
  var i, l;
  var normalizedClass = [];
  var classNames = get(component, 'classNames');

  if (classAttr) {
    normalizedClass.push(['value', classAttr]);
  }

  if (classNames) {
    for (i=0, l=classNames.length; i<l; i++) {
      normalizedClass.push(classNames[i]);
    }
  }

  var last = normalizedClass.length - 1;
  var output = [];
  for (i=0, l=normalizedClass.length; i<l; i++) {
    output.push(normalizedClass[i]);
    if (i !== last) { output.push(' '); }
  }

  if (output.length) {
    return ['concat', output];
  }
}

function tagNameFor(view) {
  var tagName = view.tagName;

  if (tagName !== null && typeof tagName === 'object' && tagName.isDescriptor) {
    tagName = get(view, 'tagName');
    Ember.deprecate('In the future using a computed property to define tagName will not be permitted. That value will be respected, but changing it will not update the element.', !tagName);
  }

  if (tagName === null || tagName === undefined) {
    tagName = 'div';
  }

  return tagName;
}
