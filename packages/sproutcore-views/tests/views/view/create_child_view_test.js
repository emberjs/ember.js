// ==========================================================================
// Project:   SproutCore Views
// Copyright: ©2006-2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = SC.set, get = SC.get;

var view, myViewClass ;

module("SC.View#createChildView", {
  setup: function() {
    view = SC.View.create();
    myViewClass = SC.View.extend({ isMyView: YES, foo: 'bar' });
  }
});

test("should create view from class with any passed attributes", function() {
  var attrs = { foo: "baz" };
  var newView = view.createChildView(myViewClass, attrs);
  ok(get(newView, 'isMyView'), 'newView is instance of myView');
  equals(get(newView, 'foo'), 'baz', 'view did get custom attributes');
  ok(!attrs.parentView, "the original attributes hash was not mutated");
});

test("should set newView.parentView to receiver", function() {
  var newView = view.createChildView(myViewClass) ;
  equals(get(newView, 'parentView'), view, 'newView.parentView == view');
});

