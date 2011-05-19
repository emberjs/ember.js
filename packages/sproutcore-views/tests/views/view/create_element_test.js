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

test("invokes didCreateElement() on receiver and all child views", function() {
  var callCount = 0;

  var view = SC.View.create({
    didCreateElement: function() { callCount++; },

    childViews: [SC.View.extend({
      didCreateElement: function() { callCount++; },
      childViews: [SC.View.extend({
        didCreateElement: function() { callCount++; }
      }), SC.View.extend({ /* no didCreateElement */ })]
    })]
  });

  // verify setup...
  ok(view.didCreateElement, 'precondition - has root');
  ok(view.childViews[0].didCreateElement, 'precondition - has firstChild');
  ok(view.childViews[0].childViews[0].didCreateElement, 'precondition - has nested child');
  ok(!get(view, 'element'), 'has no element');

  view.createElement();
  equals(callCount, 3, 'did invoke all methods');
});

test("generated element include HTML from child views as well", function() {
  var view = SC.View.create({
    childViews: [ SC.View.extend({ elementId: "foo" })]
  });

  view.createElement();
  ok(view.$('#foo').length, 'has element with child elementId');
});

