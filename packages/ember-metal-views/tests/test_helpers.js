/*globals Node */

import run from "ember-metal/run_loop";

module View from "ember-metal-views";
export { View }

export function testsFor(name, options) {
  module(name, {
    setup: function() {
      $('#qunit-fixture').innerHTML = '';
      if (options && options.setup) { options.setup(); }
    },
    teardown: function() {
      View.reset();
      if (options && options.teardown) { options.teardown(); }
    }
  });
}

export function $(selector) {
  if (selector instanceof Node) { return selector; }
  return document.querySelector(selector);
}

export function equalHTML(selector, expectedHTML, message) {
  var actualHTML = $(selector).innerHTML.replace(/ id="[^"]+"/gmi, '');
  equal(actualHTML, expectedHTML, message || "HTML matches");
}

var Ember_set = requireModule('ember-metal/property_set').set;
export function set(obj, key, value) {
  run(null, Ember_set, obj, key, value);
}

export function triggerEvent(el, name, data) {
  // var event = new Event(name);
  // el.dispatchEvent(event);
  var isKeyboardEvent = /key/.test(name);
  var event = document.createEvent('Event'); // (isKeyboardEvent ? 'KeyboardEvent' : 'Event');
  event.initEvent(name, true, true);
  if (isKeyboardEvent && data) { event.keyCode = event.which = data.keyCode; }
  // TODO: figure this out
  // if (isKeyboardEvent) {
  //   event.initKeyboardEvent(name, true, true, null, data.keyCode, DOM_KEY_LOCATION_STANDARD);
  // } else {
  //   event.initEvent(name, true, true);
  // }
  el.dispatchEvent(event);
}

export function appendTo(view, sel) {
  return run(View, View.appendTo, view, sel);
}
