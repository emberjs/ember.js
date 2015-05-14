import {
  appendTo,
  equalHTML,
  setElementText,
  testsFor
} from "ember-metal-views/tests/test_helpers";

var view;

testsFor("ember-metal-views", {
  teardown(renderer) {
    if (view) { renderer.removeAndDestroy(view); }
    view = null;
  }
});

// Test the behavior of the helper createElement stub
QUnit.test("by default, view renders as a div", function() {
  view = { isView: true };

  appendTo(view);
  equalHTML('qunit-fixture', "<div></div>");
});

// Test the behavior of the helper createElement stub
QUnit.test("tagName can be specified", function() {
  view = {
    isView: true,
    tagName: 'span'
  };

  appendTo(view);

  equalHTML('qunit-fixture', "<span></span>");
});

// Test the behavior of the helper createElement stub
QUnit.test("textContent can be specified", function() {
  view = {
    isView: true,
    textContent: 'ohai <a>derp</a>'
  };

  appendTo(view);

  equalHTML('qunit-fixture', "<div>ohai &lt;a&gt;derp&lt;/a&gt;</div>");
});

// Test the behavior of the helper createElement stub
QUnit.test("innerHTML can be specified", function() {
  view = {
    isView: true,
    innerHTML: 'ohai <a>derp</a>'
  };

  appendTo(view);

  equalHTML('qunit-fixture', "<div>ohai <a>derp</a></div>");
});

// Test the behavior of the helper createElement stub
QUnit.test("innerHTML tr can be specified", function() {
  view = {
    isView: true,
    tagName: 'table',
    innerHTML: '<tr><td>ohai</td></tr>'
  };

  appendTo(view);

  equalHTML('qunit-fixture', "<table><tr><td>ohai</td></tr></table>");
});

// Test the behavior of the helper createElement stub
QUnit.test("element can be specified", function() {
  view = {
    isView: true,
    element: document.createElement('i')
  };

  appendTo(view);

  equalHTML('qunit-fixture', "<i></i>");
});

QUnit.test("willInsertElement hook", function() {
  expect(3);

  view = {
    isView: true,

    willInsertElement(el) {
      ok(this.element && this.element.nodeType === 1, "We have an element");
      equal(this.element.parentElement, null, "The element is parentless");
      setElementText(this.element, 'you gone and done inserted that element');
    }
  };

  appendTo(view);

  equalHTML('qunit-fixture', "<div>you gone and done inserted that element</div>");
});

QUnit.test("didInsertElement hook", function() {
  expect(3);

  view = {
    isView: true,

    didInsertElement() {
      ok(this.element && this.element.nodeType === 1, "We have an element");
      equal(this.element.parentElement, document.getElementById('qunit-fixture'), "The element's parent is correct");
      setElementText(this.element, 'you gone and done inserted that element');
    }
  };

  appendTo(view);

  equalHTML('qunit-fixture', "<div>you gone and done inserted that element</div>");
});

QUnit.test("classNames - array", function() {
  view = {
    isView: true,
    classNames: ['foo', 'bar'],
    textContent: 'ohai'
  };

  appendTo(view);
  equalHTML('qunit-fixture', '<div class="foo bar">ohai</div>');
});

QUnit.test("classNames - string", function() {
  view = {
    isView: true,
    classNames: 'foo bar',
    textContent: 'ohai'
  };

  appendTo(view);
  equalHTML('qunit-fixture', '<div class="foo bar">ohai</div>');
});
