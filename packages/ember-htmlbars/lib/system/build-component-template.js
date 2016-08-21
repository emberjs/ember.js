import { assert } from 'ember-metal/debug';
import { get } from 'ember-metal/property_get';
import { internal, render } from 'htmlbars-runtime';
import { buildStatement } from 'htmlbars-util/template-utils';
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
      let attributes = normalizeComponentAttributes(component, attrs);
      let elementTemplate = internal.manualElement(tagName, attributes);
      elementTemplate.meta = meta;

      blockToRender = createElementBlock(elementTemplate, blockToRender, component);
    }

    assert('You cannot use `classNameBindings` on a tag-less component: ' + component.toString(), (() => {
      let { classNameBindings } = component;
      return tagName !== '' || !classNameBindings || classNameBindings.length === 0;
    })());

    assert('You cannot use `elementId` on a tag-less component: ' + component.toString(), (() => {
      let { elementId } = component;
      return tagName !== '' || attrs.id === elementId || (!elementId && elementId !== '');
    })());

    assert('You cannot use `attributeBindings` on a tag-less component: ' + component.toString(), (() => {
      let { attributeBindings } = component;
      return tagName !== '' || !attributeBindings || attributeBindings.length === 0;
    })());
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
      attrs[prop] = buildStatement('value', val);
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
  let output = {};
  for (let name in templates) {
    if (templates.hasOwnProperty(name)) {
      let template = templates[name];
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

  if (tagName === null || tagName === undefined) {
    tagName = 'div';
  }

  return tagName;
}

// Takes a component and builds a normalized set of attribute
// bindings consumable by HTMLBars' `attribute` hook.
function normalizeComponentAttributes(component, attrs) {
  let normalized = {};
  let attributeBindings = component.attributeBindings;

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

      assert(`Illegal attributeBinding: '${attr}' is not a valid attribute name.`, colonIndex !== -1 || attr.indexOf('.') === -1);

      let attrName, expression;
      if (colonIndex !== -1) {
        let attrProperty = attr.substring(0, colonIndex);
        attrName = attr.substring(colonIndex + 1);
        expression = buildStatement('get', attrProperty);
      } else if (attrs[attr]) {
        // TODO: For compatibility with 1.x, we probably need to `set`
        // the component's attribute here if it is a CP, but we also
        // probably want to suspend observers and allow the
        // willUpdateAttrs logic to trigger observers at the correct time.
        attrName = attr;
        expression = buildStatement('value', attrs[attr]);
      } else {
        attrName = attr;
        expression = buildStatement('get', attr);
      }

      assert('You cannot use class as an attributeBinding, use classNameBindings instead.', attrName !== 'class');
      normalized[attrName] = expression;
    }
  }

  normalized.role = normalized.role || buildStatement('get', 'ariaRole');

  if (attrs.tagName) {
    component.tagName = attrs.tagName;
  }

  let normalizedClass = normalizeClass(component, attrs);
  if (normalizedClass) {
    normalized.class = normalizedClass;
  }

  if (get(component, 'isVisible') === false) {
    let hiddenStyle = buildStatement('subexpr', '-html-safe', ['display: none;'], []);
    let existingStyle = normalized.style;

    if (existingStyle) {
      normalized.style = buildStatement('subexpr', 'concat', [existingStyle, ' ', hiddenStyle], [ ]);
    } else {
      normalized.style = hiddenStyle;
    }
  }

  return normalized;
}

function normalizeClass(component, attrs) {
  let normalizedClass = [];
  let classNames = get(component, 'classNames');
  let classNameBindings = get(component, 'classNameBindings');

  if (attrs.class) {
    if (isStream(attrs.class)) {
      normalizedClass.push(buildStatement('subexpr', '-normalize-class', [buildStatement('value', attrs.class.path), buildStatement('value', attrs.class)], []));
    } else {
      normalizedClass.push(attrs.class);
    }
  }

  if (attrs.classBinding) {
    normalizeClasses(attrs.classBinding.split(' '), normalizedClass);
  }

  if (classNames) {
    for (let i = 0; i < classNames.length; i++) {
      normalizedClass.push(classNames[i]);
    }
  }

  if (classNameBindings) {
    normalizeClasses(classNameBindings, normalizedClass);
  }

  if (normalizeClass.length) {
    return buildStatement('subexpr', '-join-classes', normalizedClass, []);
  }
}

function normalizeClasses(classes, output, streamBasePath) {
  for (let i = 0; i < classes.length; i++) {
    let className = classes[i];
    assert('classNameBindings must not have spaces in them. Multiple class name bindings can be provided as elements of an array, e.g. [\'foo\', \':bar\']', className.indexOf(' ') === -1);

    let [propName, activeClass, inactiveClass] = className.split(':');

    // Legacy :class microsyntax for static class names
    if (propName === '') {
      output.push(activeClass);
      continue;
    }

    output.push(buildStatement('subexpr', '-normalize-class', [
      // params
      buildStatement('value', propName),
      buildStatement('get', propName)
    ], [
      // hash
      'activeClass', activeClass,
      'inactiveClass', inactiveClass
    ]));
  }
}
