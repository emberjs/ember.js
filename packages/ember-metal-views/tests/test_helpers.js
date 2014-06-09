/*globals Node */

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
      renderer = new Renderer();
      renderer.scheduleRender = function (renderer, render) {
        render.call(renderer);
      };
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

export function appendTo(view) {
  renderer.appendTo(view, document.getElementById('qunit-fixture'));
  return view.element;
}
