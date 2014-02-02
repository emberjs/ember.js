// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

// FormsEditMode propagates the 'isEditing' property to its child view.
// It is simple enough that we can test it super-cleanly: mix it into
// an object, provide an array 'childViews' containing other objects,
// and match.
//
// Things to test:
//
// - Basic: isEditing defaults to NO, hasEditMode is YES; these are sanity checks.
// - Changing isEditing propagates to children.
//
module("Forms - FormsEditMode mixin");

test("Basics", function() { 
  var view = SC.Object.create(SC.FormsEditMode, { childViews: [] });

  // flags like this are often matched without .get, so test that way
  equals(view.hasEditMode, YES, "Has Edit Mode");

  // this default is good to check, as it is just the kind of thing
  // someone would change when trying to fix a different bug--for instance,
  // if FormView stopped properly initializing in edit mode.
  equals(view.get('isEditing'), NO, "isEditing defaults to NO");
});

test("Changing isEditing propagates to children", function() {
  var view = SC.Object.create(SC.FormsEditMode, {
    childViews: [SC.Object.create(SC.FormsEditMode), SC.Object.create()]
  });

  equals(view.childViews[0].get('isEditing'), NO, "Child view that hasEditing is in edit mode");
  equals(view.childViews[1].get('isEditing'), undefined, "Child view without hasEditing has not changed");

  view.set('isEditing', YES);

  equals(view.childViews[0].get('isEditing'), YES, "Child view that hasEditing is in edit mode");
  equals(view.childViews[1].get('isEditing'), undefined, "Child view without hasEditing has not changed");
});

test("Changing isEditing on something with no children doesn't crash", function() {
  var view = SC.Object.create(SC.FormsEditMode, {
    childViews: null
  });

  view.set('isEditing', YES);

  equals(view.childViews, null, "Look ma, no childViews!");
});
