// ==========================================================================
// Project:   SproutCore Views
// Copyright: ©2006-2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = SC.set, get = SC.get;

var view ;
module("SC.View#$", {
  setup: function() {
    view = SC.View.extend({
      render: function(context, firstTime) {
        context.push('<span></span>');
      }
    }).create();

    SC.run(function() {
      view.append();
    });
  },

  teardown: function() {
    view.destroy();
  }
});

test("returns an empty jQuery object if no element", function() {
  var view = SC.View.create();
  ok(!get(view, 'element'), 'precond - should have no element');
  equals(view.$().length, 0, 'should return empty jQuery object');
  equals(view.$('span').length, 0, 'should return empty jQuery object even if filter passed');
});

test("returns jQuery object selecting element if provided", function() {
  ok(get(view, 'element'), 'precond - should have element');

  var jquery = view.$();
  equals(jquery.length, 1, 'view.$() should have one element');
  equals(jquery[0], get(view, 'element'), 'element should be element');
});

test("returns jQuery object selecting element inside element if provided", function() {
  ok(get(view, 'element'), 'precond - should have element');

  var jquery = view.$('span');
  equals(jquery.length, 1, 'view.$() should have one element');
  equals(jquery[0].parentNode, get(view, 'element'), 'element should be in element');
});

test("returns empty jQuery object if filter passed that does not match item in parent", function() {
  ok(get(view, 'element'), 'precond - should have element');

  var jquery = view.$('body'); // would normally work if not scoped to view
  equals(jquery.length, 0, 'view.$(body) should have no elements');
});

