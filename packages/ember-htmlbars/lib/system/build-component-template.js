import { assert, deprecate } from 'ember-metal/debug';
import { get } from 'ember-metal/property_get';
import { internal, render } from 'htmlbars-runtime';
import getValue from 'ember-htmlbars/hooks/get-value';
import { isStream } from '../streams/utils';

export default function buildComponentTemplate({ component, tagName, layout, outerAttrs }, attrs, content) {
  if (component === undefined) {
    component = null;
  }

  let blockToRender, meta;
  if (layout && layout.raw) {
    let yieldTo = createContentBlocks(content.templates, content.scope, content.self, component);
    blockToRender = createLayoutBlock(layout.raw, yieldTo, content.self, component, attrs);
    meta = layout.raw.meta;
  } else if (content.templates && content.templates.default) {
    blockToRender = createContentBlock(content.templates.default, content.scope, content.self, component);
    meta = content.templates.default.meta;
  }

  if (component) {
    tagName = tagName || tagNameFor(component);

    // If this is not a tagless component, we need to create the wrapping
    // element. We use `manualElement` to create a template that represents
    // the wrapping element and yields to the previous block.
    if (tagName !== '') {
      var attributes = normalizeComponentAttributes(component, attrs);
      var elementTemplate = internal.manualElement(tagName, attributes);
      elementTemplate.meta = meta;

      blockToRender = createElementBlock(elementTemplate, blockToRender, component);
    } else {
      validateTaglessComponent(component);
    }
  }

  // tagName is one of:
  //   * `undefined` if no component is present
  //   * the falsy value "" if set explicitly on the component
  //   * an actual tagName set explicitly on the component
  return { createdElement: !!tagName, block: blockToRender };
}

export function buildHTMLTemplate(tagName, _attrs, content) {
  let attrs = {};

  for (let prop in _attrs) {
    let val = _attrs[prop];

    if (typeof val === 'string') {
      attrs[prop] = val;
    } else {
      attrs[prop] = ['value', val];
    }
  }

  let childTemplate = content.templates.default;
  let elementTemplate = internal.manualElement(tagName, attrs, childTemplate.isEmpty);

  if (childTemplate.isEmpty) {
    return blockFor(elementTemplate, { scope: content.scope });
  } else {
    let blockToRender = blockFor(content.templates.default, content);
    return blockFor(elementTemplate, { yieldTo: blockToRender, scope: content.scope });
  }
}

function blockFor(template, options) {
  assert('BUG: Must pass a template to blockFor', !!template);
  return internal.blockFor(render, template, options);
}

function createContentBlock(template, scope, self, component) {
  assert('BUG: buildComponentTemplate can take a scope or a self, but not both', !(scope && self));
  return blockFor(template, {
    scope,
    self,
    options: { view: component }
  });
}

function createContentBlocks(templates, scope, self, component) {
  if (!templates) {
    return;
  }
  var output = {};
  for (var name in templates) {
    if (templates.hasOwnProperty(name)) {
      var template = templates[name];
      if (template) {
        output[name] = createContentBlock(templates[name], scope, self, component);
      }
    }
  }
  return output;
}

function createLayoutBlock(template, yieldTo, self, component, attrs) {
  return blockFor(template, {
    yieldTo,

    // If we have an old-style Controller with a template it will be
    // passed as our `self` argument, and it should be the context for
    // the template. Otherwise, we must have a real Component and it
    // should be its own template context.
    self: self || component,

    options: { view: component, attrs: attrs }
  });
}

function createElementBlock(template, yieldTo, component) {
  return blockFor(template, {
    yieldTo: yieldTo,
    self: component,
    options: { view: component }
  });
}

function tagNameFor(view) {
  let tagName = view.tagName;

  if (tagName !== null && typeof tagName === 'object' && tagName.isDescriptor) {
    tagName = get(view, 'tagName');
    deprecate(
      'In the future using a computed property to define tagName will not be permitted. That value will be respected, but changing it will not update the element.',
      !tagName,
      { id: 'ember-views.computed-tag-name', until: '2.0.0' }
    );
  }

  if (tagName === null || tagName === undefined) {
    tagName = view._defaultTagName || 'div';
  }

  return tagName;
}

// Takes a component and builds a normalized set of attribute
// bindings consumable by HTMLBars' `attribute` hook.
function normalizeComponentAttributes(component, attrs) {
  let normalized = {};
  let attributeBindings = component.attributeBindings;
  let streamBasePath = component.isComponent ? '' : 'view.';

  if (attrs.id && getValue(attrs.id)) {
    // Do not allow binding to the `id`
    normalized.id = getValue(attrs.id);
    component.elementId = normalized.id;
  } else {
    normalized.id = component.elementId;
  }

  if (attributeBindings) {
    for (let i = 0; i < attributeBindings.length; i++) {
      let attr = attributeBindings[i];
      let colonIndex = attr.indexOf(':');

      let attrName, expression;
      if (colonIndex !== -1) {
        var attrProperty = attr.substring(0, colonIndex);
        attrName = attr.substring(colonIndex + 1);
        expression = ['get', `${streamBasePath}${attrProperty}`];
      } else if (attrs[attr]) {
        // TODO: For compatibility with 1.x, we probably need to `set`
        // the component's attribute here if it is a CP, but we also
        // probably want to suspend observers and allow the
        // willUpdateAttrs logic to trigger observers at the correct time.
        attrName = attr;
        expression = ['value', attrs[attr]];
      } else {
        attrName = attr;
        expression = ['get', `${streamBasePath}${attr}`];
      }

      assert('You cannot use class as an attributeBinding, use classNameBindings instead.', attrName !== 'class');
      normalized[attrName] = expression;
    }
  }

  if (attrs.tagName) {
    component.tagName = attrs.tagName;
  }

  let normalizedClass = normalizeClass(component, attrs, streamBasePath);
  if (normalizedClass) {
    normalized.class = normalizedClass;
  }

  if (get(component, 'isVisible') === false) {
    var hiddenStyle = ['subexpr', '-html-safe', ['display: none;'], []];
    var existingStyle = normalized.style;

    if (existingStyle) {
      normalized.style = ['subexpr', 'concat', [existingStyle, ' ', hiddenStyle], [ ]];
    } else {
      normalized.style = hiddenStyle;
    }
  }

  return normalized;
}

function normalizeClass(component, attrs, streamBasePath) {
  var i;
  var normalizedClass = [];
  var classNames = get(component, 'classNames');
  var classNameBindings = get(component, 'classNameBindings');

  if (attrs.class) {
    if (isStream(attrs.class)) {
      normalizedClass.push(['subexpr', '-normalize-class', [['value', attrs.class.path], ['value', attrs.class]], []]);
    } else {
      normalizedClass.push(attrs.class);
    }
  }

  if (attrs.classBinding) {
    normalizeClasses(attrs.classBinding.split(' '), normalizedClass, streamBasePath);
  }

  if (classNames) {
    for (i = 0; i < classNames.length; i++) {
      normalizedClass.push(classNames[i]);
    }
  }

  if (classNameBindings) {
    normalizeClasses(classNameBindings, normalizedClass, streamBasePath);
  }

  if (normalizeClass.length) {
    return ['subexpr', '-join-classes', normalizedClass, []];
  }
}

function normalizeClasses(classes, output, streamBasePath) {
  var i;

  for (i = 0; i < classes.length; i++) {
    var className = classes[i];
    assert('classNameBindings must not have spaces in them. Multiple class name bindings can be provided as elements of an array, e.g. [\'foo\', \':bar\']', className.indexOf(' ') === -1);

    var [propName, activeClass, inactiveClass] = className.split(':');

    // Legacy :class microsyntax for static class names
    if (propName === '') {
      output.push(activeClass);
      continue;
    }

    var prop = `${streamBasePath}${propName}`;

    output.push(['subexpr', '-normalize-class', [
      // params
      ['value', propName],
      ['get', prop]
    ], [
      // hash
      'activeClass', activeClass,
      'inactiveClass', inactiveClass
    ]]);
  }
}

function validateTaglessComponent(component) {
  assert('You cannot use `classNameBindings` on a tag-less component: ' + component.toString(), () => {
    var classNameBindings = component.classNameBindings;
    return !classNameBindings || classNameBindings.length === 0;
  }());
}
