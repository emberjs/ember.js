import { internal, render } from "htmlbars-runtime";
import { read } from "ember-metal/streams/utils";
import { get } from "ember-metal/property_get";

export default function buildComponentTemplate(componentInfo, attrs, content) {
  var component, layoutTemplate, blockToRender;
  var createdElementBlock = false;

  component = componentInfo.component;

  blockToRender = function() {};

  if (content.template) {
    blockToRender = createContentBlock(content.template, content.scope, content.self, component || null);
  }

  layoutTemplate = componentInfo.layout;

  if (layoutTemplate) {
    blockToRender = createLayoutBlock(layoutTemplate.raw, blockToRender, content.self, component || null, attrs);
  }

  if (component) {
    var tagName = tagNameFor(component);

    // If this is not a tagless component, we need to create the wrapping
    // element. We use `manualElement` to create a template that represents
    // the wrapping element and yields to the previous block.
    if (tagName !== '') {
      var attributes = normalizeComponentAttributes(component, attrs);
      var elementTemplate = internal.manualElement(tagName, attributes);

      createdElementBlock = true;

      blockToRender = createElementBlock(elementTemplate, blockToRender, component);
    }

    return { createdElement: tagName !== '', block: blockToRender };
  }

  return { createdElement: false, block: blockToRender };
}

function blockFor(template, options) {
  Ember.assert("BUG: Must pass a template to blockFor", !!template);
  return internal.blockFor(render, template, options);
}

function createContentBlock(template, scope, self) {
  Ember.assert("BUG: buildComponentTemplate can take a scope or a self, but not both", !(scope && self));

  return blockFor(template, {
    scope: scope,
    self: self
  });
}

function createLayoutBlock(template, yieldTo, self, component, attrs) {
  return blockFor(template, {
    yieldTo: yieldTo,
    self: component,
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

// Takes a component and builds a normalized set of attribute
// bindings consumable by HTMLBars' `attribute` hook.
function normalizeComponentAttributes(component, attrs) {
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
        // TODO: For compatibility with 1.x, we probably need to `set`
        // the component's attribute here if it is a CP, but we also
        // probably want to suspend observers and allow the
        // willUpdateAttrs logic to trigger observers at the correct time.
        normalized[attr] = ['value', attrs[attr]];
      } else {
        normalized[attr] = ['get', 'view.' + attr];
      }
    }
  }

  if (attrs.id) {
    // Do not allow binding to the `id`
    normalized.id = read(attrs.id);
    component.elementId = normalized.id;
  } else {
    normalized.id = component.elementId;
  }

  if (attrs.tagName) {
    component.tagName = attrs.tagName;
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
  var classNameBindings = get(component, 'classNameBindings');

  if (classAttr) {
    normalizedClass.push(['value', classAttr]);
  }

  if (classNames) {
    for (i=0, l=classNames.length; i<l; i++) {
      normalizedClass.push(classNames[i]);
    }
  }

  if (classNameBindings) {
    for (i=0, l=classNameBindings.length; i<l; i++) {
      var className = classNameBindings[i];
      var microsyntax = className.split(':');
      var prop = 'view.' + microsyntax[0];
      var activeClass, inactiveClass;

      if (microsyntax.length === 1) {
        activeClass = prop;
      } else if (microsyntax.length === 2) {
        activeClass = microsyntax[1];
      } else {
        activeClass = microsyntax[1];
        inactiveClass = microsyntax[2];
      }

      normalizedClass.push(['subexpr', '-normalize-class', [
        // params
        ['get', prop]
      ], [
        // hash
        'activeClass', activeClass,
        'inactiveClass', inactiveClass
      ]]);
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
function normalizeClass(component, classAttr) {
  var i, l;
  var normalizedClass = [];
  var classNames = get(component, 'classNames');
  var classNameBindings = get(component, 'classNameBindings');

  if (classAttr) {
    normalizedClass.push(['value', classAttr]);
  }

  if (classNames) {
    for (i=0, l=classNames.length; i<l; i++) {
      normalizedClass.push(classNames[i]);
    }
  }

  if (classNameBindings) {
    for (i=0, l=classNameBindings.length; i<l; i++) {
      var className = classNameBindings[i];
      var microsyntax = className.split(':');
      var prop = 'view.' + microsyntax[0];
      var activeClass, inactiveClass;

      if (microsyntax.length === 1) {
        activeClass = prop;
      } else if (microsyntax.length === 2) {
        activeClass = microsyntax[1];
      } else {
        activeClass = microsyntax[1];
        inactiveClass = microsyntax[2];
      }

      normalizedClass.push(['subexpr', '-normalize-class', [
        // params
        ['get', prop]
      ], [
        // hash
        'activeClass', activeClass,
        'inactiveClass', inactiveClass
      ]]);
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

function normalizeClass(component, classAttr) {
  var i, l;
  var normalizedClass = [];
  var classNames = get(component, 'classNames');
  var classNameBindings = get(component, 'classNameBindings');

  if (classAttr) {
    normalizedClass.push(['value', classAttr]);
  }

  if (classNames) {
    for (i=0, l=classNames.length; i<l; i++) {
      normalizedClass.push(classNames[i]);
    }
  }

  if (classNameBindings) {
    for (i=0, l=classNameBindings.length; i<l; i++) {
      var className = classNameBindings[i];
      var microsyntax = className.split(':');
      var prop = 'view.' + microsyntax[0];
      var activeClass, inactiveClass;

      if (microsyntax.length === 1) {
        activeClass = prop;
      } else if (microsyntax.length === 2) {
        activeClass = microsyntax[1];
      } else {
        activeClass = microsyntax[1];
        inactiveClass = microsyntax[2];
      }

      normalizedClass.push(['subexpr', '-normalize-class', [
        // params
        ['get', prop]
      ], [
        // hash
        'activeClass', activeClass,
        'inactiveClass', inactiveClass
      ]]);
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
