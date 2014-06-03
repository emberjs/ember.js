import { addObserver } from "ember-metal/observer";
import run from "ember-metal/run_loop";
import { get } from "ember-metal/property_get";

/*
  var type = Ember.typeOf(value);

  // if this changes, also change the logic in ember-handlebars/lib/helpers/binding.js
  if (name !== 'value' && (type === 'string' || (type === 'number' && !isNaN(value)))) {
    if (value !== elem.attr(name)) {
      elem.attr(name, value);
    }
  } else if (name === 'value' || type === 'boolean') {
    if (Ember.isNone(value) || value === false) {
      // `null`, `undefined` or `false` should remove attribute
      elem.removeAttr(name);
      elem.prop(name, '');
    } else if (value !== elem.prop(name)) {
      // value should always be properties
      elem.prop(name, value);
    }
  } else if (!value) {
    elem.removeAttr(name);
  }
*/

function setAttribute(name, key) {
  var value = get(this, key),
      type = typeof value,
      el = this.element;

  if (!el) { return; }

  if (name === 'value' || type === 'boolean') {
    if (value || value === 0) {
      el[name] = value;
    } else {
      el.removeAttribute(name);
      el[name] = '';
    }
  } else {
    if (value) { el.setAttribute(name, value); } else { el.removeAttribute(name); }
  }
}

// HOOK
function setupAttribute(view, attributeKey, attributeName) {
  setAttribute.call(view, attributeName, attributeKey);

  addObserver(view, attributeKey, null, function() {
    run.schedule('render', this, setAttribute, attributeName, attributeKey);
  });
}

var STRING_DECAMELIZE_REGEXP = (/([a-z\d])([A-Z])/g);
function decamelize(str) {
  return str.replace(STRING_DECAMELIZE_REGEXP, '$1_$2').toLowerCase();
}

var STRING_DASHERIZE_REGEXP = (/[ _]/g);
function dasherize(str) {
  return decamelize(str).replace(STRING_DASHERIZE_REGEXP,'-');
}

function changeClass(truthyClass, falsyClass, key) {
  var value = get(this, key), // FIXME: have to use get for property paths here
      type = typeof value,
      el = this.element;

  if (!el) { return; }

  if (!truthyClass && !falsyClass) {
    truthyClass = dasherize(key);
  }
  if (type === 'string') {
    if (value) {
      if (truthyClass) { el.classList.add(value); }
    }
  } else if (value) {
    if (falsyClass) { el.classList.remove(falsyClass); }
    if (truthyClass) { el.classList.add(truthyClass); }
  } else {
    if (truthyClass) { el.classList.remove(truthyClass); }
    if (falsyClass) { el.classList.add(falsyClass); }
  }
}

// TODO: decouple from classList
function setupClassNameBinding(view, key, truthyClass, falsyClass) {
  changeClass.call(view, truthyClass, falsyClass, key);

  addObserver(view, key, null, function() {
    run.schedule('render', this, changeClass, truthyClass, falsyClass, key);
  });
}

function setupClassNameBindings(view) {
  var classNameBindings = view.classNameBindings,
      className, parts;

  if (!classNameBindings || classNameBindings.length === 0) { return; }

  for (var i = 0, l = classNameBindings.length; i < l; i++) {
    className = classNameBindings[i]; // TODO: support className aliases
    parts = _parseClassNameBindingString(className);
    setupClassNameBinding(view, parts[0], parts[1], parts[2]); // FIXME: teardown
  }
}

function setupAttributeBindings(view) {
  var attributeBindings = view.attributeBindings,
      attribute, parts;

  if (!attributeBindings || attributeBindings.length === 0) { return; }

  for (var i = 0, l = attributeBindings.length; i < l; i++) {
    attribute = attributeBindings[i]; // TODO: support attribute aliases
    parts = _parseAttributeString(attribute);
    setupAttribute(view, parts[0], parts[1]); // FIXME: teardown
  }
}

function setupClassNames(view) {
  var classNames = view.classNames,
      el = view.element;

  if (typeof classNames === 'string') {
    el.setAttribute('class', classNames);
  } else if (classNames && classNames.length) {
    if (classNames.length === 1) { // PERF: avoid join'ing unnecessarily
      el.setAttribute('class', classNames[0]);
    } else {
      el.setAttribute('class', classNames.join(' ')); // TODO: faster way to do this?
    }
  }
}

function _parseAttributeString(str) {
  var parts = str.split(':');
  if (parts.length === 1) {
    parts.push(str);
  }
  return parts;
}


function _parseClassNameBindingString(str) {
  var parts = str.split(':');
  return parts;
}

export { setupClassNames, setupClassNameBindings, setupAttributeBindings };