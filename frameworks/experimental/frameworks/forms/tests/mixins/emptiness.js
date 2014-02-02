// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module("Forms - CalculatesEmptiness");

test("Basics - Walks like a duck and all that", function() {
  var calculatesEmptiness = SC.Object.create(SC.CalculatesEmptiness, { childViews: [] });

  equals(calculatesEmptiness.hasCalculatesEmptiness, YES, "hasCalculatesEmptiness gets set");
});

test("Is not empty when isValueEmpty is NO", function() {
  SC.RunLoop.begin();
  var o = SC.Object.create(SC.CalculatesEmptiness, {
    isVisible: YES, childViews: []
  });
  SC.RunLoop.end();

  equals(o.get('isEmpty'), YES, "Starts out as empty because isValueEmpty is YES");

  SC.RunLoop.begin();
  o.set('isValueEmpty', NO);
  SC.RunLoop.end();

  equals(o.get('isEmpty'), NO, "No longer empty after changing isValueEmpty");
});

test("Is empty when isVisible is NO", function() {
  SC.RunLoop.begin();
  var o = SC.Object.create(SC.CalculatesEmptiness, {
    isVisible: YES, childViews: [], isValueEmpty: NO
  });
  SC.RunLoop.end();

  equals(o.get('isEmpty'), NO, "Starts out as empty because isValueEmpty is NO");

  SC.RunLoop.begin();
  o.set('isVisible', NO);
  SC.RunLoop.end();

  equals(o.get('isEmpty'), YES, "Now empty after changing isVisible");
});

test("isEditing makes it not empty", function() {
  SC.RunLoop.begin();
  var o = SC.Object.create(SC.CalculatesEmptiness, {
    isVisible: YES, childViews: []
  });
  SC.RunLoop.end();

  equals(o.get('isEmpty'), YES, "Starts out as empty because isValueEmpty is YES");

  SC.RunLoop.begin();
  o.set('isEditing', YES);
  SC.RunLoop.end();

  equals(o.get('isEmpty'), NO, "No longer empty after changing isEditing");
});

test("isEditing does not change emptiness if isEditingAffectsIsEmpty is NO", function() {
  SC.RunLoop.begin();
  var o = SC.Object.create(SC.CalculatesEmptiness, {
    isVisible: YES, childViews: [], isEditing: YES
  });
  SC.RunLoop.end();

  equals(o.get('isEmpty'), NO, "Starts out as non-empty because isEditing is YES");

  SC.RunLoop.begin();
  o.set('isEditingAffectsIsEmpty', NO);
  SC.RunLoop.end();

  equals(o.get('isEmpty'), YES, "Empty after changing isEditingAffectsIsEmpty");

});

test("Is empty if no children provide hasCalculatesEmptiness", function() {
  SC.RunLoop.begin();
  var o = SC.Object.create(SC.CalculatesEmptiness, {
    isVisible: YES,
    childViews: [
      SC.Object.create(), SC.Object.create()
    ]
  });
  SC.RunLoop.end();

  equals(o.get('isEmpty'), YES, "Is empty because it has no value and all children don't use emptiness");
});

test("Is empty depends on emptiness of children with hasCalculatesEmptiness", function() {
  SC.RunLoop.begin();
  var o = SC.Object.create(SC.CalculatesEmptiness, {
    isVisible: YES,
    childViews: [
      SC.Object.create(SC.CalculatesEmptiness, { childViews: [], isVisible: YES }), SC.Object.create()
    ]
  });
  SC.RunLoop.end();

  // needed so that the child view can notify the parent of changes to emptiness
  o.childViews[0].parentView = o;

  equals(o.get('isEmpty'), YES, "Is empty because the child that hasCalculatesEmptiness is empty");

  SC.RunLoop.begin();
  o.childViews[0].set('isValueEmpty', NO);
  SC.RunLoop.end();

  equals(o.childViews[0].get('isEmpty'), NO, "Child view is not empty.");
  equals(o.get('isEmpty'), NO, "Is no longer empty because the child is not empty");
});
