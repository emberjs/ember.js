// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = SC.set, get = SC.get;

module("SC.View#destroyElement");

test("it if has no element, does nothing", function() {
  var callCount = 0;
  var view = SC.View.create({
    willDestroyElement: function() { callCount++; }
  });

  ok(!get(view, 'element'), 'precond - does NOT have element');

  SC.run(function() {
    view.destroyElement();
  });

  equals(callCount, 0, 'did not invoke callback');
});

test("if it has a element, calls willDestroyElement on receiver and child views then deletes the element", function() {
  var parentCount = 0, childCount = 0;

  var view = SC.View.create({
    willDestroyElement: function() { parentCount++; },
    childViews: [SC.View.extend({
      // no willDestroyElement here... make sure no errors are thrown
      childViews: [SC.View.extend({
        willDestroyElement: function() { childCount++; }
      })]
    })]
  });

  view.createElement();
  ok(get(view, 'element'), 'precond - view has element');

  SC.run(function() {
    view.destroyElement();
  });

  equals(parentCount, 1, 'invoked destroy element on the parent');
  equals(childCount, 1, 'invoked destroy element on the child');
  ok(!get(view, 'element'), 'view no longer has element');
  ok(!get(get(view, 'childViews').objectAt(0), 'element'), 'child no longer has an element');
});

test("returns receiver", function() {
  var view = SC.View.create().createElement();
  equals(view.destroyElement(), view, 'returns receiver');
});

test("removes element from parentNode if in DOM", function() {
  var view = SC.View.create();

  SC.run(function() {
    view.append();
  });

  ok(get(view, 'element'), 'precond - has element');

  SC.run(function() {
    view.destroyElement();
  });

  ok(!view.$().parent().length, 'element no longer in parent node');
});
