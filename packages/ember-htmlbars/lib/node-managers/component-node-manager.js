import { assert, warn } from 'ember-metal/debug';
import buildComponentTemplate from 'ember-htmlbars/system/build-component-template';
import getCellOrValue from 'ember-htmlbars/hooks/get-cell-or-value';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import { MUTABLE_CELL } from 'ember-views/compat/attrs-proxy';
import { instrument } from 'ember-htmlbars/system/instrumentation-support';
import LegacyEmberComponent, { HAS_BLOCK } from 'ember-htmlbars/component';
import extractPositionalParams from 'ember-htmlbars/utils/extract-positional-params';
import { setOwner } from 'container/owner';

// In theory this should come through the env, but it should
// be safe to import this until we make the hook system public
// and it gets actively used in addons or other downstream
// libraries.
import getValue from 'ember-htmlbars/hooks/get-value';

export default function ComponentNodeManager(component, scope, renderNode, attrs, block, expectElement) {
  this.component = component;
  this.scope = scope;
  this.renderNode = renderNode;
  this.attrs = attrs;
  this.block = block;
  this.expectElement = expectElement;
}

ComponentNodeManager.create = function ComponentNodeManager_create(renderNode, env, options) {
  let { tagName,
        params,
        attrs = {},
        parentView,
        parentScope,
        component,
        layout,
        templates } = options;

  component = component || LegacyEmberComponent;

  let createOptions = {
    parentView,
    [HAS_BLOCK]: !!templates.default
  };

  configureTagName(attrs, tagName, component, createOptions);

  // Map passed attributes (e.g. <my-component id="foo">) to component
  // properties ({ id: "foo" }).
  configureCreateOptions(attrs, createOptions);

  // If there is a controller on the scope, pluck it off and save it on the
  // component. This allows the component to target actions sent via
  // `sendAction` correctly.
  if (parentScope.hasLocal('controller')) {
    createOptions._controller = getValue(parentScope.getLocal('controller'));
  } else {
    createOptions._targetObject = getValue(parentScope.getSelf());
  }

  extractPositionalParams(renderNode, component, params, attrs);

  // Instantiate the component
  component = createComponent(component, createOptions, renderNode, env, attrs);

  // If the component specifies its layout via the `layout` property
  // instead of using the template looked up in the container, get it
  // now that we have the component instance.
  if (!layout) {
    layout = get(component, 'layout');
  }

  let results = buildComponentTemplate(
    { layout, component }, attrs, { templates, scope: parentScope }
  );

  return new ComponentNodeManager(component, parentScope, renderNode, attrs, results.block, results.createdElement);
};


function configureTagName(attrs, tagName, component, createOptions) {
  if (attrs.tagName) {
    createOptions.tagName = getValue(attrs.tagName);
  }
}

function configureCreateOptions(attrs, createOptions) {
  // Some attrs are special and need to be set as properties on the component
  // instance. Make sure we use getValue() to get them from `attrs` since
  // they are still streams.
  if (attrs.id) { createOptions.elementId = getValue(attrs.id); }
  if (attrs._defaultTagName) { createOptions._defaultTagName = getValue(attrs._defaultTagName); }
  if (attrs.viewName) { createOptions.viewName = getValue(attrs.viewName); }
}

ComponentNodeManager.prototype.render = function ComponentNodeManager_render(_env, visitor) {
  var { component } = this;

  return instrument(component, function ComponentNodeManager_render_instrument() {
    let meta = this.block && this.block.template.meta;
    let env = _env.childWithView(component, meta);

    env.renderer.componentWillRender(component);
    env.renderedViews.push(component.elementId);

    if (this.block) {
      this.block.invoke(env, [], undefined, this.renderNode, this.scope, visitor);
    }

    let element;
    if (this.expectElement) {
      element = this.renderNode.firstNode;
    }

    // In environments like FastBoot, disable any hooks that would cause the component
    // to access the DOM directly.
    if (env.destinedForDOM) {
      env.renderer.didCreateElement(component, element);
      env.renderer.willInsertElement(component, element);

      env.lifecycleHooks.push({ type: 'didInsertElement', view: component });
    }
  }, this);
};

ComponentNodeManager.prototype.rerender = function ComponentNodeManager_rerender(_env, attrs, visitor) {
  var component = this.component;

  return instrument(component, function ComponentNodeManager_rerender_instrument() {
    let env = _env.childWithView(component);

    var snapshot = takeSnapshot(attrs);

    if (component._renderNode.shouldReceiveAttrs) {
      if (component._propagateAttrsToThis) {
        component._propagateAttrsToThis(takeLegacySnapshot(attrs));
      }

      env.renderer.componentUpdateAttrs(component, snapshot);
      component._renderNode.shouldReceiveAttrs = false;
    }

    // Notify component that it has become dirty and is about to change.
    env.renderer.componentWillUpdate(component, snapshot);
    env.renderer.componentWillRender(component);

    env.renderedViews.push(component.elementId);

    if (this.block) {
      this.block.invoke(env, [], undefined, this.renderNode, this.scope, visitor);
    }

    env.lifecycleHooks.push({ type: 'didUpdate', view: component });

    return env;
  }, this);
};

ComponentNodeManager.prototype.destroy = function ComponentNodeManager_destroy() {
  let component = this.component;

  // Clear component's render node. Normally this gets cleared
  // during view destruction, but in this case we're re-assigning the
  // node to a different view and it will get cleaned up automatically.
  component._renderNode = null;
  component.destroy();
};

export function createComponent(_component, props, renderNode, env, attrs = {}) {
  assert('controller= is no longer supported', !('controller' in attrs));

  snapshotAndUpdateTarget(attrs, props);

  setOwner(props, env.owner);
  props.renderer = props.parentView ? props.parentView.renderer : env.owner.lookup('renderer:-dom');
  props._viewRegistry = props.parentView ? props.parentView._viewRegistry : env.owner.lookup('-view-registry:main');

  let component = _component.create(props);

  if (props.parentView) {
    props.parentView.appendChild(component);

    if (props.viewName) {
      set(props.parentView, props.viewName, component);
    }
  }

  component._renderNode = renderNode;
  renderNode.emberView = component;
  renderNode.buildChildEnv = buildChildEnv;
  return component;
}

function takeSnapshot(attrs) {
  let hash = {};

  for (var prop in attrs) {
    hash[prop] = getCellOrValue(attrs[prop]);
  }

  return hash;
}

export function takeLegacySnapshot(attrs) {
  let hash = {};

  for (var prop in attrs) {
    hash[prop] = getValue(attrs[prop]);
  }

  return hash;
}

function snapshotAndUpdateTarget(rawAttrs, target) {
  let attrs = {};

  for (var prop in rawAttrs) {
    let value = getCellOrValue(rawAttrs[prop]);
    attrs[prop] = value;

    // when `attrs` is an actual value being set in the
    // attrs hash (`{{foo-bar attrs="blah"}}`) we cannot
    // set `"blah"` to the root of the target because
    // that would replace all attrs with `attrs.attrs`
    if (prop === 'attrs') {
      warn(`Invoking a component with a hash attribute named \`attrs\` is not supported. Please refactor usage of ${target} to avoid passing \`attrs\` as a hash parameter.`, false, { id: 'ember-htmlbars.component-unsupported-attrs' });
      continue;
    }

    if (value && value[MUTABLE_CELL]) {
      value = value.value;
    }

    target[prop] = value;
  }

  return target.attrs = attrs;
}

function buildChildEnv(state, env) {
  return env.childWithView(this.emberView);
}
