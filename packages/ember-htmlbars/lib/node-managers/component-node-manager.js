import { assert, warn, runInDebug } from 'ember-metal/debug';
import buildComponentTemplate from 'ember-views/system/build-component-template';
import getCellOrValue from 'ember-htmlbars/hooks/get-cell-or-value';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import { MUTABLE_CELL } from 'ember-views/compat/attrs-proxy';
import { instrument } from 'ember-htmlbars/system/instrumentation-support';
import LegacyEmberComponent from 'ember-views/components/component';
import GlimmerComponent from 'ember-htmlbars/glimmer-component';
import { Stream } from 'ember-metal/streams/stream';
import { readArray } from 'ember-metal/streams/utils';
import { symbol } from 'ember-metal/utils';

// These symbols will be used to limit link-to's public API surface area.
export let HAS_BLOCK = symbol('HAS_BLOCK');

// In theory this should come through the env, but it should
// be safe to import this until we make the hook system public
// and it gets actively used in addons or other downstream
// libraries.
import getValue from 'ember-htmlbars/hooks/get-value';

function ComponentNodeManager(component, isAngleBracket, scope, renderNode, attrs, block, expectElement) {
  this.component = component;
  this.isAngleBracket = isAngleBracket;
  this.scope = scope;
  this.renderNode = renderNode;
  this.attrs = attrs;
  this.block = block;
  this.expectElement = expectElement;
}

export default ComponentNodeManager;

ComponentNodeManager.create = function ComponentNodeManager_create(renderNode, env, options) {
  let { tagName,
        params,
        attrs,
        parentView,
        parentScope,
        isAngleBracket,
        component,
        layout,
        templates } = options;

  attrs = attrs || {};

  component = component || (isAngleBracket ? GlimmerComponent : LegacyEmberComponent);

  let createOptions = {
    parentView,
    [HAS_BLOCK]: !!templates.default
  };

  configureTagName(attrs, tagName, component, isAngleBracket, createOptions);

  // Map passed attributes (e.g. <my-component id="foo">) to component
  // properties ({ id: "foo" }).
  configureCreateOptions(attrs, createOptions);

  // If there is a controller on the scope, pluck it off and save it on the
  // component. This allows the component to target actions sent via
  // `sendAction` correctly.
  if (parentScope.hasLocal('controller')) {
    createOptions._controller = getValue(parentScope.getLocal('controller'));
  }

  extractPositionalParams(renderNode, component, params, attrs);

  // Instantiate the component
  component = createComponent(component, isAngleBracket, createOptions, renderNode, env, attrs);

  // If the component specifies its layout via the `layout` property
  // instead of using the template looked up in the container, get it
  // now that we have the component instance.
  layout = get(component, 'layout') || layout;

  runInDebug(() => {
    if (isAngleBracket) {
      assert(`You cannot invoke the '${tagName}' component with angle brackets, because it's a subclass of Component. Please upgrade to GlimmerComponent. Alternatively, you can invoke as '{{${tagName}}}'.`, component.isGlimmerComponent);
    } else {
      assert(`You cannot invoke the '${tagName}' component with curly braces, because it's a subclass of GlimmerComponent. Please invoke it as '<${tagName}>' instead.`, !component.isGlimmerComponent);
    }

    if (!layout) { return; }

    let fragmentReason = layout.meta.fragmentReason;
    if (isAngleBracket && fragmentReason) {
      switch (fragmentReason.name) {
        case 'missing-wrapper':
          assert(`The <${tagName}> template must have a single top-level element because it is a GlimmerComponent.`);
          break;
        case 'modifiers':
          let modifiers = fragmentReason.modifiers.map(m => `{{${m} ...}}`);
          assert(`You cannot use ${ modifiers.join(', ') } in the top-level element of the <${tagName}> template because it is a GlimmerComponent.`);
          break;
        case 'triple-curlies':
          assert(`You cannot use triple curlies (e.g. style={{{ ... }}}) in the top-level element of the <${tagName}> template because it is a GlimmerComponent.`);
          break;
      }
    }
  });

  let results = buildComponentTemplate(
    { layout, component, isAngleBracket }, attrs, { templates, scope: parentScope }
  );

  return new ComponentNodeManager(component, isAngleBracket, parentScope, renderNode, attrs, results.block, results.createdElement);
};

function extractPositionalParams(renderNode, component, params, attrs) {
  let positionalParams = component.positionalParams;

  if (positionalParams) {
    processPositionalParams(renderNode, positionalParams, params, attrs);
  }
}

function processPositionalParams(renderNode, positionalParams, params, attrs) {
  // if the component is rendered via {{component}} helper, the first
  // element of `params` is the name of the component, so we need to
  // skip that when the positional parameters are constructed
  const paramsStartIndex = renderNode.getState().isComponentHelper ? 1 : 0;
  const isNamed = typeof positionalParams === 'string';
  let paramsStream;

  if (isNamed) {
    paramsStream = new Stream(() => {
      return readArray(params.slice(paramsStartIndex));
    }, 'params');

    attrs[positionalParams] = paramsStream;
  }

  if (isNamed) {
    for (let i = paramsStartIndex; i < params.length; i++) {
      let param = params[i];
      paramsStream.addDependency(param);
    }
  } else {
    for (let i = 0; i < positionalParams.length; i++) {
      let param = params[paramsStartIndex + i];
      attrs[positionalParams[i]] = param;
    }
  }
}

function configureTagName(attrs, tagName, component, isAngleBracket, createOptions) {
  if (isAngleBracket) {
    createOptions.tagName = tagName;
  } else if (attrs.tagName) {
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
    let env = _env.childWithView(component);

    env.renderer.componentWillRender(component);
    env.renderedViews.push(component.elementId);

    if (this.block) {
      this.block.invoke(env, [], undefined, this.renderNode, this.scope, visitor);
    }

    let element;
    if (this.expectElement || component.isGlimmerComponent) {
      // This code assumes that Glimmer components are never fragments. When
      // Glimmer components gain fragment powers, we will need to communicate
      // whether the layout produced a single top-level node or fragment
      // somehow (either via static information on the template/component, or
      // dynamically as the layout is being rendered).
      element = this.renderNode.firstNode;

      // Glimmer components may have whitespace or boundary nodes around the
      // top-level element.
      if (element && element.nodeType !== 1) {
        element = nextElementSibling(element);
      }
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

function nextElementSibling(node) {
  let current = node;

  while (current) {
    if (current.nodeType === 1) { return current; }
    current = node.nextSibling;
  }
}

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

export function createComponent(_component, isAngleBracket, props, renderNode, env, attrs = {}) {
  if (!isAngleBracket) {
    assert('controller= is no longer supported', !('controller' in attrs));

    snapshotAndUpdateTarget(attrs, props);
  } else {
    props.attrs = takeSnapshot(attrs);

    props._isAngleBracket = true;
  }

  props.renderer = props.parentView ? props.parentView.renderer : env.container.lookup('renderer:-dom');
  props._viewRegistry = props.parentView ? props.parentView._viewRegistry : env.container.lookup('-view-registry:main');

  let component = _component.create(props);

  // for the fallback case
  component.container = component.container || env.container;

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
