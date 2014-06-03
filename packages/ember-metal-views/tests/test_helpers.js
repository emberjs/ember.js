/*globals Node */

import run from "ember-metal/run_loop";

import Renderer from "ember-metal-views";

var renderer;

var hooks = {
  scheduleRender: function (renderer, render) {
    render.call(renderer);
  }
};

export function testsFor(name, options) {
  QUnit.module(name, {
    setup: function() {
      renderer = new Renderer(hooks);
      if (options && options.setup) { options.setup(renderer); }
    },
    teardown: function() {
      if (options && options.teardown) { options.teardown(renderer); }
      renderer = undefined;
    }
  });
}

export function subject() {
  return renderer;
}

export function equalHTML(element, expectedHTML, message) {
  var html;
  if (typeof element === 'string') {
    html = document.getElementById(element).innerHTML;
  } else {
    html = element.outerHTML;
  }

  var actualHTML = html.replace(/ id="[^"]+"/gmi, '');
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

export function appendTo(view) {
  run(renderer, renderer.appendTo, view, document.getElementById('qunit-fixture'));
  return view.element;
}
