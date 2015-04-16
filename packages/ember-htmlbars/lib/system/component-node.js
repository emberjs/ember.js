import merge from "ember-metal/merge";
import Ember from "ember-metal/core";
import buildComponentTemplate from "ember-views/system/build-component-template";
import { readHash, read } from "ember-metal/streams/utils";
import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";

function ComponentNode(component, scope, renderNode, block, expectElement) {
  this.component = component;
  this.scope = scope;
  this.renderNode = renderNode;
  this.block = block;
  this.expectElement = expectElement;
}

export default ComponentNode;

ComponentNode.create = function(renderNode, env, attrs, found, parentView, path, contentScope, contentTemplate) {
  found = found || lookupComponent(env, path);
  Ember.assert('HTMLBars error: Could not find component named "' + path + '" (no component or template with that name was found)', function() {
    if (path) {
      return found.component || found.layout;
    } else {
      return found.component || found.layout || contentTemplate;
    }
  });

  var component;
  var componentInfo = { layout: found.layout };

  if (found.component) {
    var options = { parentView: parentView };

    if (found.createOptions) {
      merge(options, found.createOptions);
    }

    if (attrs && attrs.id) { options.elementId = read(attrs.id); }
    if (attrs && attrs.tagName) { options.tagName = read(attrs.tagName); }
    if (attrs && attrs._defaultTagName) { options._defaultTagName = read(attrs._defaultTagName); }
    if (attrs && attrs.viewName) { options.viewName = read(attrs.viewName); }

    component = componentInfo.component = createOrUpdateComponent(found.component, options, renderNode);

    let layout = get(component, 'layout');
    if (layout) {
      componentInfo.layout = layout;
      if (!contentTemplate) {
        let template = get(component, 'template');
        if (template) {
          Ember.deprecate("Using deprecated `template` property on a Component.");
          contentTemplate = template.raw;
        }
      }
    } else {
      componentInfo.layout = get(component, 'template') || componentInfo.layout;
    }

    renderNode.emberView = component;
  }

  Ember.assert("BUG: ComponentNode.create can take a scope or a self, but not both", !(contentScope && found.self));

  var results = buildComponentTemplate(componentInfo, attrs, {
    template: contentTemplate,
    scope: contentScope,
    self: found.self
  });

  return new ComponentNode(component, contentScope, renderNode, results.block, results.createdElement);
};

ComponentNode.prototype.render = function(env, attrs, visitor) {
  var component = this.component;

  var newEnv = env;
  if (component) {
    newEnv = merge({}, env);
    newEnv.view = component;
  }

  if (component) {
    var snapshot = readHash(attrs);
    env.renderer.setAttrs(this.component, snapshot);
    env.renderer.willRender(component);
  }

  this.block(newEnv, [], this.renderNode, this.scope, visitor);

  if (component) {
    env.renderer.didCreateElement(component, this.expectElement && this.renderNode.firstNode);
    env.lifecycleHooks.push({ type: 'didInsertElement', view: component });
  }
};

ComponentNode.prototype.rerender = function(env, attrs, visitor) {
  var component = this.component;

  var newEnv = env;
  if (component) {
    newEnv = merge({}, env);
    newEnv.view = component;

    var snapshot = readHash(attrs);

    // Notify component that it has become dirty and is about to change.
    env.renderer.willUpdate(component, snapshot);

    if (component.renderNode.shouldReceiveAttrs) {
      env.renderer.updateAttrs(component, snapshot);
      component.renderNode.shouldReceiveAttrs = false;
    }

    env.renderer.willRender(component);
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

export function createOrUpdateComponent(component, options, renderNode) {
  if (component.create) {
    component = component.create(options);
  }

  if (options.parentView) {
    options.parentView.appendChild(component);

    // don't set the property on a virtual view, as they are invisible to
    // consumers of the view API
    if (options.viewName) {
      set(get(options.parentView, 'concreteView'), options.viewName, component);
    }
  }

  component.renderNode = renderNode;
  renderNode.emberComponent = component;
  renderNode.emberView = component;
  return component;
}
