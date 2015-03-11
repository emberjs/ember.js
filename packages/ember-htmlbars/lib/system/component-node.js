import merge from "ember-metal/merge";
import Ember from "ember-metal/core";
import buildComponentTemplate from "ember-views/system/build-component-template";
import { readHash } from "ember-metal/streams/utils";

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

  var component;
  var componentInfo = { layout: found.layout };

  if (found.component) {
    var options = { parentView: parentView };
    if (attrs.id) { options.elementId = attrs.id; }
    if (attrs.tagName) { options.tagName = attrs.tagName; }

    component = componentInfo.component = createComponent(found.component, options, renderNode);
  }

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

    if (component.renderNode.state.shouldReceiveAttrs) {
      env.renderer.updateAttrs(component, snapshot);
      component.renderNode.state.shouldReceiveAttrs = false;
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

function createComponent(component, options, renderNode) {
  if (component.create) {
    component = component.create(options);
  }

  if (options.parentView) {
    options.parentView.linkChild(component);
  }

  component.renderNode = renderNode;
  renderNode.state.component = component;
  renderNode.state.view = component;
  return component;
}

