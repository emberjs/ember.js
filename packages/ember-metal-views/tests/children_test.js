import { testsFor, subject, equalHTML, appendTo } from "ember-metal-views/tests/test_helpers";

testsFor("ember-metal-views - children");

test("a view can have child views", function() {
  var view = {
    isView: true,
    tagName: 'ul',
    _childViews: [
      {isView: true, tagName: 'li', textContent: 'ohai'}
    ]
  };

  appendTo(view);
  equalHTML('qunit-fixture', "<ul><li>ohai</li></ul>");
});

test("didInsertElement fires after children are rendered", function() {
  expect(2);

  var view = {
    isView: true,
    tagName: 'ul',
    _childViews: [
      {isView: true, tagName: 'li', textContent: 'ohai'}
    ],

    didInsertElement: function() {
      equalHTML(this.element, "<ul><li>ohai</li></ul>", "Children are rendered");
    }
  };

  appendTo(view);
  equalHTML('qunit-fixture', "<ul><li>ohai</li></ul>");

  subject().destroy(view);
});
