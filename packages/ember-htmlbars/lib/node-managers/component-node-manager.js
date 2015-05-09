import merge from "ember-metal/merge";
import Ember from "ember-metal/core";
import buildComponentTemplate from "ember-views/system/build-component-template";
import lookupComponent from "ember-htmlbars/utils/lookup-component";
import getCellOrValue from "ember-htmlbars/hooks/get-cell-or-value";
import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import setProperties from "ember-metal/set_properties";
import View from "ember-views/views/view";
import { MUTABLE_CELL } from "ember-views/compat/attrs-proxy";
import { instrument } from "ember-htmlbars/system/instrumentation-support";

// In theory this should come through the env, but it should
// be safe to import this until we make the hook system public
// and it gets actively used in addons or other downstream
// libraries.
import getValue from "ember-htmlbars/hooks/get-value";

function ComponentNodeManager(component, scope, renderNode, attrs, block, expectElement) {
  this.component = component;
  this.scope = scope;
  this.renderNode = renderNode;
  this.attrs = attrs;
  this.block = block;
  this.expectElement = expectElement;
}

export default ComponentNodeManager;

ComponentNodeManager.create = function(renderNode, env, options) {
  let { tagName,
        params,
        attrs,
        parentView,
        parentScope,
        templates } = options;

  attrs = attrs || {};

  // Try to find the Component class and/or template for this component name in
  // the container.
  let { component, layout } = lookupComponent(env.container, tagName);

  Ember.assert('HTMLBars error: Could not find component named "' + tagName + '" (no component or template with that name was found)', function() {
    return component || layout;
  });

  //var componentInfo = { layout: found.layout };

  if (component) {
    let createOptions = { parentView };

    // Some attrs are special and need to be set as properties on the component
    // instance. Make sure we use getValue() to get them from `attrs` since
    // they are still streams.
    if (attrs.id) { createOptions.elementId = getValue(attrs.id); }
    if (attrs.tagName) { createOptions.tagName = getValue(attrs.tagName); }
    if (attrs._defaultTagName) { createOptions._defaultTagName = getValue(attrs._defaultTagName); }
    if (attrs.viewName) { createOptions.viewName = getValue(attrs.viewName); }

    if (component.create && parentScope && parentScope.self) {
      createOptions._context = getValue(parentScope.self);
    }

    if (parentScope.locals.controller) {
      createOptions._controller = getValue(parentScope.locals.controller);
    }

    component = createOrUpdateComponent(component, createOptions, renderNode, env, attrs);

    // Even though we looked up a layout from the container earlier, the
    // component may specify a `layout` property that overrides that.
    // The component may also provide a `template` property we should
    // respect (though this behavior is deprecated).
    let componentLayout = get(component, 'layout');
    let componentTemplate = get(component, 'template');

    if (componentLayout) {
      layout = componentLayout;

      // There is no block template provided but the component has a
      // `template` property.
      if ((!templates || !templates.default) && componentTemplate) {
        Ember.deprecate("Using deprecated `template` property on a Component.");
        templates = { default: componentTemplate.raw };
      }
    } else if (componentTemplate) {
      // If the component has a `template` but no `layout`, use the template
      // as the layout.
      layout = componentTemplate;
    }

    renderNode.emberView = component;

    if (component.positionalParams) {
      // if the component is rendered via {{component}} helper, the first
      // element of `params` is the name of the component, so we need to
      // skip that when the positional parameters are constructed
      let paramsStartIndex = renderNode.state.isComponentHelper ? 1 : 0;
      let pp = component.positionalParams;
      for (let i=0; i<pp.length; i++) {
        attrs[pp[i]] = params[paramsStartIndex + i];
      }
    }
  }

  var results = buildComponentTemplate({ layout: layout, component: component }, attrs, {
    templates,
    scope: parentScope
  });

  return new ComponentNodeManager(component, parentScope, renderNode, attrs, results.block, results.createdElement);
};

ComponentNodeManager.prototype.render = function(env, visitor) {
  var { component, attrs } = this;

  return instrument(component, function() {

    var newEnv = env;
    if (component) {
      newEnv = merge({}, env);
      newEnv.view = component;
    }

    if (component) {
      var snapshot = takeSnapshot(attrs);
      env.renderer.setAttrs(this.component, snapshot);
      env.renderer.willCreateElement(component);
      env.renderer.willRender(component);
      env.renderedViews.push(component.elementId);
    }

    if (this.block) {
      this.block(newEnv, [], undefined, this.renderNode, this.scope, visitor);
    }

    if (component) {
      var element = this.expectElement && this.renderNode.firstNode;
      env.renderer.didCreateElement(component, element); // 2.0TODO: Remove legacy hooks.
      env.renderer.willInsertElement(component, element);
      env.lifecycleHooks.push({ type: 'didInsertElement', view: component });
    }
  }, this);
};

ComponentNodeManager.prototype.rerender = function(env, attrs, visitor) {
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

    if (component) {
      env.lifecycleHooks.push({ type: 'didUpdate', view: component });
    }

    return newEnv;
  }, this);
};


export function createOrUpdateComponent(component, options, renderNode, env, attrs = {}) {
  let snapshot = takeSnapshot(attrs);
  let props = merge({}, options);
  let defaultController = View.proto().controller;
  let hasSuppliedController = 'controller' in attrs;

  props.attrs = snapshot;

  if (component.create) {
    let proto = component.proto();
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
  renderNode.emberComponent = component;
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
