// ==========================================================================
// Project:   SproutCore Views
// Copyright: ©2006-2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = SC.set, get = SC.get;

module("SC.View#createElement");

test("returns the receiver", function() {
  var view = SC.View.create();
  equals(view.createElement(), view, 'returns receiver');
});

test("calls render and turns resultant string into element", function() {
  var view = SC.View.create({
    tagName: 'span',

    render: function(buffer) {
      buffer.push("foo");
    }
  });

  equals(get(view, 'element'), null, 'precondition - has no element');
  view.createElement();

  var elem = get(view, 'element');
  ok(elem, 'has element now');
  equals(elem.innerHTML, 'foo', 'has innerHTML from context');
  equals(elem.tagName.toString().toLowerCase(), 'span', 'has tagName from view');
});

test("generated element include HTML from child views as well", function() {
  var view = SC.ContainerView.create({
    childViews: [ SC.View.create({ elementId: "foo" })]
  });

  view.createElement();
  ok(view.$('#foo').length, 'has element with child elementId');
});

