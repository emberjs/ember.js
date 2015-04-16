import { internal, render } from "htmlbars-runtime";
import { read } from "ember-metal/streams/utils";
import { get } from "ember-metal/property_get";
import { isGlobal } from "ember-metal/path_cache";

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

function createContentBlock(template, scope, self, component) {
  Ember.assert("BUG: buildComponentTemplate can take a scope or a self, but not both", !(scope && self));

  return blockFor(template, {
    scope: scope,
    self: self,
    options: { view: component }
  });
}

function createLayoutBlock(template, yieldTo, self, component, attrs) {
  return blockFor(template, {
    yieldTo: yieldTo,

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
  var tagName = view.tagName;

  if (tagName !== null && typeof tagName === 'object' && tagName.isDescriptor) {
    tagName = get(view, 'tagName');
    Ember.deprecate('In the future using a computed property to define tagName will not be permitted. That value will be respected, but changing it will not update the element.', !tagName);
  }

  if (tagName === null || tagName === undefined) {
    tagName = view._defaultTagName || 'div';
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

  var normalizedClass = normalizeClass(component, attrs);

  if (normalizedClass) {
    normalized.class = normalizedClass;
  }

  return normalized;
}

function normalizeClass(component, attrs) {
  var i, l;
  var normalizedClass = [];
  var classNames = get(component, 'classNames');
  var classNameBindings = get(component, 'classNameBindings');

  if (attrs.class) {
    if (typeof attrs.class === 'string') {
      normalizedClass.push(attrs.class);
    } else {
      normalizedClass.push(['subexpr', '-normalize-class', [['value', attrs.class.path], ['value', attrs.class]], []]);
    }
  }

  if (attrs.classBinding) {
    normalizeClasses(attrs.classBinding.split(' '), normalizedClass);
  }

  if (attrs.classNames) {
    normalizedClass.push(['value', attrs.classNames]);
  }

  if (classNames) {
    for (i=0, l=classNames.length; i<l; i++) {
      normalizedClass.push(classNames[i]);
    }
  }

  if (classNameBindings) {
    normalizeClasses(classNameBindings, normalizedClass);
  }

  if (normalizeClass.length) {
    return ['subexpr', '-join-classes', normalizedClass, []];
  }
}

function normalizeClasses(classes, output) {
  var i, l;

  for (i=0, l=classes.length; i<l; i++) {
    var className = classes[i];
    var [propName, activeClass, inactiveClass] = className.split(':');

    // Legacy :class microsyntax for static class names
    if (propName === '') {
      output.push(activeClass);
      return;
    }

    // 2.0TODO: Remove deprecated global path
    var prop = isGlobal(propName) ? propName : 'view.' + propName;

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
