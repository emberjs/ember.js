import { testsFor, View, $, equalHTML, appendTo } from "ember-metal-views/tests/test_helpers";

module("ember-metal-views - children", {
  setup: function() {
    $('#qunit-fixture').innerHTML = '';
  }
});

test("a view can have child views", function() {
  var view = {
    isView: true,
    tagName: 'ul',
    _childViews: [
      {isView: true, tagName: 'li', textContent: 'ohai'}
    ]
  };

  appendTo(view, '#qunit-fixture');
  equalHTML('#qunit-fixture', "<ul><li>ohai</li></ul>");
});

test("didInsertElement fires after children are rendered", function() {
  expect(2);

  var view = {
    isView: true,
    tagName: 'ul',
    _childViews: [
      {isView: true, tagName: 'li', textContent: 'ohai'}
    ],

    didInsertElement: function(el) {
      equal(el.outerHTML, "<ul><li>ohai</li></ul>", "Children are rendered");
    }
  };

  appendTo(view, '#qunit-fixture');
  equalHTML('#qunit-fixture', "<ul><li>ohai</li></ul>");

  View.destroy(view);
});