import Ember from 'ember-metal/core';
import assign from 'ember-metal/assign';
import buildComponentTemplate from 'ember-views/system/build-component-template';
import lookupComponent from 'ember-htmlbars/utils/lookup-component';
import getCellOrValue from 'ember-htmlbars/hooks/get-cell-or-value';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import setProperties from 'ember-metal/set_properties';
import { MUTABLE_CELL } from 'ember-views/compat/attrs-proxy';
import SafeString from 'htmlbars-util/safe-string';
import { instrument } from 'ember-htmlbars/system/instrumentation-support';
import EmberComponent from 'ember-views/components/component';
import Stream from 'ember-metal/streams/stream';
import { readArray } from 'ember-metal/streams/utils';

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

ComponentNodeManager.create = function(renderNode, env, options) {
  let { tagName,
        params,
        attrs,
        parentView,
        parentScope,
        isAngleBracket,
        templates } = options;

  attrs = attrs || {};

  // Try to find the Component class and/or template for this component name in
  // the container.
  let { component, layout } = lookupComponent(env.container, tagName);

  Ember.assert('HTMLBars error: Could not find component named "' + tagName + '" (no component or template with that name was found)', function() {
    return component || layout;
  });

  component = component || EmberComponent;

  let createOptions = { parentView };

  configureTagName(attrs, tagName, component, isAngleBracket, createOptions);

  // Map passed attributes (e.g. <my-component id="foo">) to component
  // properties ({ id: "foo" }).
  configureCreateOptions(attrs, createOptions);

  // If there is a controller on the scope, pluck it off and save it on the
  // component. This allows the component to target actions sent via
  // `sendAction` correctly.
  if (parentScope.locals.controller) {
    createOptions._controller = getValue(parentScope.locals.controller);
  }

  // this flag is set when a block was provided so that components can see if
  // `this.get('template')` is truthy.  this is added for backwards compat only
  // and accessing `template` prop on a component will trigger a deprecation
  // 2.0TODO: remove
  if (templates.default) {
    createOptions._deprecatedFlagForBlockProvided = true;
  }

  let proto = extractPositionalParams(renderNode, component, params, attrs);

  // Instantiate the component
  component = createComponent(component, isAngleBracket, createOptions, renderNode, env, attrs, proto);

  // If the component specifies its template via the `layout` or `template`
  // properties instead of using the template looked up in the container, get
  // them now that we have the component instance.
  let result = extractComponentTemplates(component, templates);
  layout = result.layout || layout;
  templates = result.templates || templates;


  let results = buildComponentTemplate(
    { layout, component, isAngleBracket }, attrs, { templates, scope: parentScope }
  );

  return new ComponentNodeManager(component, isAngleBracket, parentScope, renderNode, attrs, results.block, results.createdElement);
};

function extractPositionalParams(renderNode, component, params, attrs) {
  let positionalParams = component.positionalParams;
  let proto;

  if (!positionalParams) {
    proto = component.proto();
    positionalParams = proto.positionalParams;

    Ember.deprecate(
      'Calling `var Thing = Ember.Component.extend({ positionalParams: [\'a\', \'b\' ]});` ' +
        'is deprecated in favor of `Thing.reopenClass({ positionalParams: [\'a\', \'b\'] });',
      !positionalParams,
      { id: 'ember-htmlbars.component-positional-params', until: '2.0.0' }
    );
  }

  if (positionalParams) {
    processPositionalParams(renderNode, positionalParams, params, attrs);
  }

  // returns `proto` here so that we can avoid doing this
  // twice for each initial render per component (it is also needed in `createComponent`)
  return proto;
}

function processPositionalParams(renderNode, positionalParams, params, attrs) {
  // if the component is rendered via {{component}} helper, the first
  // element of `params` is the name of the component, so we need to
  // skip that when the positional parameters are constructed
  const paramsStartIndex = renderNode.state.isComponentHelper ? 1 : 0;
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

function extractComponentTemplates(component, _templates) {
  // Even though we looked up a layout from the container earlier, the
  // component may specify a `layout` property that overrides that.
  // The component may also provide a `template` property we should
  // respect (though this behavior is deprecated).
  let componentLayout = get(component, 'layout');
  let hasBlock = _templates && _templates.default;
  let layout, templates, componentTemplate;
  if (hasBlock) {
    componentTemplate = null;
  } else if (component.isComponent) {
    componentTemplate = get(component, '_template');
  } else {
    componentTemplate = get(component, 'template');
  }

  if (componentLayout) {
    layout = componentLayout;
    templates = extractLegacyTemplate(_templates, componentTemplate);
  } else if (componentTemplate) {
    // If the component has a `template` but no `layout`, use the template
    // as the layout.
    layout = componentTemplate;
    templates = _templates;
    Ember.deprecate('Using deprecated `template` property on a Component.', false, { id: 'ember-htmlbars.extract-component-templates', until: '3.0.0' });
  }

  return { layout, templates };
}

// 2.0TODO: Remove legacy behavior
function extractLegacyTemplate(_templates, componentTemplate) {
  let templates;

  // There is no block template provided but the component has a
  // `template` property.
  if ((!_templates || !_templates.default) && componentTemplate) {
    Ember.deprecate('Using deprecated `template` property on a Component.', false, { id: 'ember-htmlbars.extract-legacy-template', until: '3.0.0' });
    templates = { default: componentTemplate.raw };
  } else {
    templates = _templates;
  }

  return templates;
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

ComponentNodeManager.prototype.render = function(_env, visitor) {
  var { component } = this;

  return instrument(component, function() {
    let env = _env.childWithView(component);

    env.renderer.componentWillRender(component);
    env.renderedViews.push(component.elementId);

    if (this.block) {
      this.block(env, [], undefined, this.renderNode, this.scope, visitor);
    }

    var element = this.expectElement && this.renderNode.firstNode;

    handleLegacyRender(component, element);
    env.renderer.didCreateElement(component, element);
    env.renderer.willInsertElement(component, element); // 2.0TODO remove legacy hook

    env.lifecycleHooks.push({ type: 'didInsertElement', view: component });
  }, this);
};

export function handleLegacyRender(component, element) {
  if (!component.render) { return; }

  Ember.assert('Legacy render functions are not supported with angle-bracket components', !component._isAngleBracket);

  var content, node, lastChildIndex;
  var buffer = [];
  var renderNode = component._renderNode;
  component.render(buffer);
  content = buffer.join('');
  if (element) {
    lastChildIndex = renderNode.childNodes.length - 1;
    node = renderNode.childNodes[lastChildIndex];
  } else {
    node = renderNode;
  }
  node.setContent(new SafeString(content));
}

ComponentNodeManager.prototype.rerender = function(_env, attrs, visitor) {
  var component = this.component;

  return instrument(component, function() {
    let env = _env.childWithView(component);

    var snapshot = takeSnapshot(attrs);

    if (component._renderNode.shouldReceiveAttrs) {
      env.renderer.componentUpdateAttrs(component, snapshot);

      if (!component._isAngleBracket) {
        setProperties(component, mergeBindings({}, shadowedAttrs(component, snapshot)));
      }

      component._renderNode.shouldReceiveAttrs = false;
    }

    // Notify component that it has become dirty and is about to change.
    env.renderer.componentWillUpdate(component, snapshot);
    env.renderer.componentWillRender(component);

    env.renderedViews.push(component.elementId);

    if (this.block) {
      this.block(env, [], undefined, this.renderNode, this.scope, visitor);
    }

    env.lifecycleHooks.push({ type: 'didUpdate', view: component });

    return env;
  }, this);
};

ComponentNodeManager.prototype.destroy = function() {
  let component = this.component;

  // Clear component's render node. Normally this gets cleared
  // during view destruction, but in this case we're re-assigning the
  // node to a different view and it will get cleaned up automatically.
  component._renderNode = null;
  component.destroy();
};

export function createComponent(_component, isAngleBracket, _props, renderNode, env, attrs = {}, proto = _component.proto()) {
  let props = assign({}, _props);

  if (!isAngleBracket) {
    let hasSuppliedController = 'controller' in attrs; // 2.0TODO remove
    Ember.deprecate('controller= is deprecated', !hasSuppliedController, { id: 'ember-htmlbars.create-component', until: '3.0.0' });

    let snapshot = takeSnapshot(attrs);
    props.attrs = snapshot;

    mergeBindings(props, shadowedAttrs(proto, snapshot));
  } else {
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
      Ember.warn(`Invoking a component with a hash attribute named \`attrs\` is not supported. Please refactor usage of ${target} to avoid passing \`attrs\` as a hash parameter.`, false, { id: 'ember-htmlbars.component-unsupported-attrs' });
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

function buildChildEnv(state, env) {
  return env.childWithView(this.emberView);
}
