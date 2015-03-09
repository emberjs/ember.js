import { get } from "ember-metal/property_get";
import run from "ember-metal/run_loop";
import EmberView from "ember-views/views/view";

import compile from "ember-template-compiler/system/compile";

var View, view;

QUnit.module("EmberView - renderToElement()", {
  setup: function() {
    View = EmberView.extend({
      template: compile('<h1>hello world</h1> goodbye world')
    });
  },

  teardown: function() {
    run(function() {
      if (!view.isDestroyed) { view.destroy(); }
    });
  }
});

QUnit.test("should render into and return a body element", function() {
  view = View.create();

  ok(!get(view, 'element'), "precond - should not have an element");

  var element;

  run(function() {
    element = view.renderToElement();
  });

  equal(element.tagName, "BODY", "returns a body element");
  equal(element.firstChild.tagName, "DIV", "renders the view div");
  equal(element.firstChild.firstChild.tagName, "H1", "renders the view div");
  equal(element.firstChild.firstChild.nextSibling.textContent, " goodbye world", "renders the text node");
});

QUnit.test("should create and render into an element with a provided tagName", function() {
  view = View.create();

  ok(!get(view, 'element'), "precond - should not have an element");

  var element;

  run(function() {
    element = view.renderToElement('div');
  });

  equal(element.tagName, "DIV", "returns a body element");
  equal(element.firstChild.tagName, "DIV", "renders the view div");
  equal(element.firstChild.firstChild.tagName, "H1", "renders the view div");
  equal(element.firstChild.firstChild.nextSibling.textContent, " goodbye world", "renders the text node");
});
