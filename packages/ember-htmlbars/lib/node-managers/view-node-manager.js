import merge from "ember-metal/merge";
import Ember from "ember-metal/core";
import buildComponentTemplate from "ember-views/system/build-component-template";
import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import setProperties from "ember-metal/set_properties";
import View from "ember-views/views/view";
import { MUTABLE_CELL } from "ember-views/compat/attrs-proxy";
import getCellOrValue from "ember-htmlbars/hooks/get-cell-or-value";
import { instrument } from "ember-htmlbars/system/instrumentation-support";
import { handleLegacyRender } from "ember-htmlbars/node-managers/component-node-manager";

// In theory this should come through the env, but it should
// be safe to import this until we make the hook system public
// and it gets actively used in addons or other downstream
// libraries.
import getValue from "ember-htmlbars/hooks/get-value";

function ViewNodeManager(component, scope, renderNode, block, expectElement) {
  this.component = component;
  this.scope = scope;
  this.renderNode = renderNode;
  this.block = block;
  this.expectElement = expectElement;
}

export default ViewNodeManager;

ViewNodeManager.create = function(renderNode, env, attrs, found, parentView, path, contentScope, contentTemplate) {
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

    if (attrs && attrs.id) { options.elementId = getValue(attrs.id); }
    if (attrs && attrs.tagName) { options.tagName = getValue(attrs.tagName); }
    if (attrs && attrs._defaultTagName) { options._defaultTagName = getValue(attrs._defaultTagName); }
    if (attrs && attrs.viewName) { options.viewName = getValue(attrs.viewName); }

    if (found.component.create && contentScope && contentScope.self) {
      options._context = getValue(contentScope.self);
    }

    if (found.self) {
      options._context = getValue(found.self);
    }

    component = componentInfo.component = createOrUpdateComponent(found.component, options, found.createOptions, renderNode, env, attrs);

    let layout = get(component, 'layout');
    if (layout) {
      componentInfo.layout = layout;
      if (!contentTemplate) {
        let template = get(component, 'template');
        if (template) {
          Ember.deprecate("Using deprecated `template` property on a " + (component.isView ? 'View' : 'Component') + ".");
          contentTemplate = template.raw;
        }
      }
    } else {
      componentInfo.layout = get(component, 'template') || componentInfo.layout;
    }

    renderNode.emberView = component;
  }

  Ember.assert("BUG: ViewNodeManager.create can take a scope or a self, but not both", !(contentScope && found.self));

  var results = buildComponentTemplate(componentInfo, attrs, {
    templates: { default: contentTemplate },
    scope: contentScope,
    self: found.self
  });

  return new ViewNodeManager(component, contentScope, renderNode, results.block, results.createdElement);
};

ViewNodeManager.prototype.render = function(env, attrs, visitor) {
  var component = this.component;

  return instrument(component, function() {

    var newEnv = env;
    if (component) {
      newEnv = merge({}, env);
      newEnv.view = component;
    }

    if (component) {
      var snapshot = takeSnapshot(attrs);
      env.renderer.setAttrs(this.component, snapshot);
      env.renderer.willRender(component);
      env.renderedViews.push(component.elementId);
    }

    if (this.block) {
      this.block(newEnv, [], undefined, this.renderNode, this.scope, visitor);
    }

    if (component) {
      var element = this.expectElement && this.renderNode.firstNode;
      handleLegacyRender(component, element);

      env.renderer.didCreateElement(component, element); // 2.0TODO: Remove legacy hooks.
      env.renderer.willInsertElement(component, element);
      env.lifecycleHooks.push({ type: 'didInsertElement', view: component });
    }
  }, this);

};

ViewNodeManager.prototype.rerender = function(env, attrs, visitor) {
  var component = this.component;

  return instrument(component, function() {
    var newEnv = env;
    if (component) {
      newEnv = merge({}, env);
      newEnv.view = component;

      var snapshot = takeSnapshot(attrs);

      // Notify component that it has become dirty and is about to change.
      env.renderer.willUpdate(component, snapshot);

      if (component._renderNode.shouldReceiveAttrs) {
        env.renderer.updateAttrs(component, snapshot);
        setProperties(component, mergeBindings({}, shadowedAttrs(component, snapshot)));
        component._renderNode.shouldReceiveAttrs = false;
      }

      env.renderer.willRender(component);

      env.renderedViews.push(component.elementId);
    }
    if (this.block) {
      this.block(newEnv, [], undefined, this.renderNode, this.scope, visitor);
    }

    return newEnv;
  }, this);
};

export function createOrUpdateComponent(component, options, createOptions, renderNode, env, attrs = {}) {
  let snapshot = takeSnapshot(attrs);
  let props = merge({}, options);
  let defaultController = View.proto().controller;
  let hasSuppliedController = 'controller' in attrs || 'controller' in props;

  props.attrs = snapshot;
  if (component.create) {
    let proto = component.proto();

    if (createOptions) {
      merge(props, createOptions);
    }

    mergeBindings(props, shadowedAttrs(proto, snapshot));
    props.container = options.parentView ? options.parentView.container : env.container;

    if (proto.controller !== defaultController || hasSuppliedController) {
      delete props._context;
    }

    component = component.create(props);
  } else {
    mergeBindings(props, shadowedAttrs(component, snapshot));
    setProperties(component, props);
  }

  if (options.parentView) {
    options.parentView.appendChild(component);

    if (options.viewName) {
      set(options.parentView, options.viewName, component);
    }
  }

  component._renderNode = renderNode;
  renderNode.emberView = component;
  return component;
}

function shadowedAttrs(target, attrs) {
  let shadowed = {};

  // For backwards compatibility, set the component property
  // if it has an attr with that name. Undefined attributes
  // are handled on demand via the `unknownProperty` hook.
  for (var attr in attrs) {
    if (attr in target) {
      // TODO: Should we issue a deprecation here?
      //Ember.deprecate(deprecation(attr));
      shadowed[attr] = attrs[attr];
    }
  }

  return shadowed;
}

function takeSnapshot(attrs) {
  let hash = {};

  for (var prop in attrs) {
    hash[prop] = getCellOrValue(attrs[prop]);
  }

  return hash;
}

function mergeBindings(target, attrs) {
  for (var prop in attrs) {
    if (!attrs.hasOwnProperty(prop)) { continue; }
    // when `attrs` is an actual value being set in the
    // attrs hash (`{{foo-bar attrs="blah"}}`) we cannot
    // set `"blah"` to the root of the target because
    // that would replace all attrs with `attrs.attrs`
    if (prop === 'attrs') {
      Ember.warn(`Invoking a component with a hash attribute named \`attrs\` is not supported. Please refactor usage of ${target} to avoid passing \`attrs\` as a hash parameter.`);
      continue;
    }
    let value = attrs[prop];

    if (value && value[MUTABLE_CELL]) {
      target[prop] = value.value;
    } else {
      target[prop] = value;
    }
  }

  return target;
}
