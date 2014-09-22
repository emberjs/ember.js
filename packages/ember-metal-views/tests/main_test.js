/*globals HTMLElement */

import { testsFor, equalHTML, appendTo } from "ember-metal-views/tests/test_helpers";

var view;

testsFor("ember-metal-views", {
  teardown: function(renderer) {
    if (view) { renderer.destroy(view); }
    view = null;
  }
});

// Test the behavior of the helper createElement stub
test("by default, view renders as a div", function() {
  view = {isView: true};

  appendTo(view);
  equalHTML('qunit-fixture', "<div></div>");
});

// Test the behavior of the helper createElement stub
test("tagName can be specified", function() {
  view = {
    isView: true,
    tagName: 'span'
  };

  appendTo(view);

  equalHTML('qunit-fixture', "<span></span>");
});

// Test the behavior of the helper createElement stub
test("textContent can be specified", function() {
  view = {
    isView: true,
    textContent: 'ohai <a>derp</a>'
  };

  appendTo(view);

  equalHTML('qunit-fixture', "<div>ohai &lt;a&gt;derp&lt;/a&gt;</div>");
});

// Test the behavior of the helper createElement stub
test("innerHTML can be specified", function() {
  view = {
    isView: true,
    innerHTML: 'ohai <a>derp</a>'
  };

  appendTo(view);

  equalHTML('qunit-fixture', "<div>ohai <a>derp</a></div>");
});

// Test the behavior of the helper createElement stub
test("innerHTML tr can be specified", function() {
  view = {
    isView: true,
    tagName: 'table',
    innerHTML: '<tr><td>ohai</td></tr>'
  };

  appendTo(view);

  equalHTML('qunit-fixture', "<table><tbody><tr><td>ohai</td></tr></tbody></table>");
});

// Test the behavior of the helper createElement stub
test("element can be specified", function() {
  view = {
    isView: true,
    element: document.createElement('i')
  };

  appendTo(view);

  equalHTML('qunit-fixture', "<i></i>");
});

test("willInsertElement hook", function() {
  expect(3);

  view = {
    isView: true,

    willInsertElement: function(el) {
      ok(this.element instanceof HTMLElement, "We have an element");
      equal(this.element.parentElement, null, "The element is parentless");
      this.element.textContent = 'you gone and done inserted that element';
    }
  };

  appendTo(view);

  equalHTML('qunit-fixture', "<div>you gone and done inserted that element</div>");
});

test("didInsertElement hook", function() {
  expect(3);

  view = {
    isView: true,

    didInsertElement: function() {
      ok(this.element instanceof HTMLElement, "We have an element");
      equal(this.element.parentElement, document.getElementById('qunit-fixture'), "The element's parent is correct");
      this.element.textContent = 'you gone and done inserted that element';
    }
  };

  appendTo(view);

  equalHTML('qunit-fixture', "<div>you gone and done inserted that element</div>");
});

test("classNames - array", function() {
  view = {
    isView: true,
    classNames: ['foo', 'bar'],
    textContent: 'ohai'
  };

  appendTo(view);
  equalHTML('qunit-fixture', '<div class="foo bar">ohai</div>');
});

test("classNames - string", function() {
  view = {
    isView: true,
    classNames: 'foo bar',
    textContent: 'ohai'
  };

  appendTo(view);
  equalHTML('qunit-fixture', '<div class="foo bar">ohai</div>');
});
