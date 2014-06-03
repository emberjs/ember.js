/*globals HTMLElement */

import { testsFor, View, $, equalHTML, set, appendTo } from "ember-metal-views/tests/test_helpers";
import run from "ember-metal/run_loop";

var view;

testsFor("ember-metal-views", {
  teardown: function() {
    if (view) { View.destroy(view); }
    view = null;
  }
});

test("by default, view renders as a div", function() {
  view = {isView: true};

  appendTo(view, '#qunit-fixture');
  equalHTML('#qunit-fixture', "<div></div>");
});

test("tagName can be specified", function() {
  view = {
    isView: true,
    tagName: 'span'
  };

  appendTo(view, '#qunit-fixture');

  equalHTML('#qunit-fixture', "<span></span>");
});

test("textContent can be specified", function() {
  view = {
    isView: true,
    textContent: 'ohai <a>derp</a>'
  };

  appendTo(view, '#qunit-fixture');

  equalHTML('#qunit-fixture', "<div>ohai &lt;a&gt;derp&lt;/a&gt;</div>");
});

test("innerHTML can be specified", function() {
  view = {
    isView: true,
    innerHTML: 'ohai <a>derp</a>'
  };

  appendTo(view, '#qunit-fixture');

  equalHTML('#qunit-fixture', "<div>ohai <a>derp</a></div>");
});

test("element can be specified", function() {
  view = {
    isView: true,
    element: document.createElement('i')
  };

  appendTo(view, '#qunit-fixture');

  equalHTML('#qunit-fixture', "<i></i>");
});

test("willInsertElement hook", function() {
  expect(4);

  view = {
    isView: true,

    willInsertElement: function(el) {
      ok(this.element instanceof HTMLElement, "We have an element");
      equal(this.element, el, 'The element gets passed in for convenience');
      equal(this.element.parentElement, null, "The element is parentless");
      this.element.textContent = 'you gone and done inserted that element';
    }
  };

  appendTo(view, '#qunit-fixture');

  equalHTML('#qunit-fixture', "<div>you gone and done inserted that element</div>");
});

test("didInsertElement hook", function() {
  expect(4);

  view = {
    isView: true,

    didInsertElement: function(el) {
      ok(this.element instanceof HTMLElement, "We have an element");
      equal(this.element, el, 'The element gets passed in for convenience');
      equal(this.element.parentElement, $('#qunit-fixture'), "The element's parent is correct");
      this.element.textContent = 'you gone and done inserted that element';
    }
  };

  appendTo(view, '#qunit-fixture');

  equalHTML('#qunit-fixture', "<div>you gone and done inserted that element</div>");
});

test("classNames - array", function() {
  view = {
    isView: true,
    classNames: ['foo', 'bar'],
    textContent: 'ohai'
  };

  appendTo(view, '#qunit-fixture');
  equalHTML('#qunit-fixture', '<div class="foo bar">ohai</div>');
});

test("classNames - string", function() {
  view = {
    isView: true,
    classNames: 'foo bar',
    textContent: 'ohai'
  };

  appendTo(view, '#qunit-fixture');
  equalHTML('#qunit-fixture', '<div class="foo bar">ohai</div>');
});

test("attributeBindings", function() {
  view = {
    isView: true,
    tagName: 'a',
    attributeBindings: ['href'],
    href: '/foo',
    textContent: 'ohai'
  };

  appendTo(view, '#qunit-fixture');
  equalHTML('#qunit-fixture', '<a href="/foo">ohai</a>', "Attribute was set on initial render");

  run(null, set, view, 'href', '/bar');
  equalHTML('#qunit-fixture', '<a href="/bar">ohai</a>', "Attribute updated when set");
});

test("transclusion", function() {
  var originalElement = document.createElement('foo-component');
  originalElement.textContent = 'derp';

  view = {
    isView: true,
    tagName: 'div',
    element: originalElement
  };

  appendTo(view, '#qunit-fixture');
  equalHTML('#qunit-fixture', '<div>derp</div>', "The passed in element is replaced, content is maintained");

});

test("classNameBindings", function() {
  view = {
    isView: true,
    classNameBindings: ['isEnabled'],
    isEnabled: true
  };

  appendTo(view, '#qunit-fixture');
  equalHTML('#qunit-fixture', '<div class="is-enabled"></div>');

  set(view, 'isEnabled', false);
  equalHTML('#qunit-fixture', '<div class=""></div>');
});