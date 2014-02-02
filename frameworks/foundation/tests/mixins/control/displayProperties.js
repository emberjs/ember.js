// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same */

var view ;
module("SC.Control#displayProperties", {
  setup: function() {
    view = SC.View.create(SC.Control, {
        isVisibleInWindow: YES
    }).createLayer();
    view._doAttach(document.body);
  },

  teardown: function() {
    view.destroy();
  }
});

test("setting isSelected to YES adds sel class name", function() {
  SC.RunLoop.begin();
  view.set('isSelected', YES);
  SC.RunLoop.end();
  ok(view.$().hasClass('sel'), 'should have css class sel');
});

test("setting isSelected to SC.MIXED_STATE add mixed class name, and removes sel class name", function() {
  SC.RunLoop.begin();
  view.set('isSelected', SC.MIXED_STATE);
  SC.RunLoop.end();
  ok(view.$().hasClass('mixed'), 'should have css class mixed');
  ok(!view.$().hasClass('sel'), 'should NOT have css class sel');
});

test("setting isSelected to ON removes sel class name", function() {
  SC.RunLoop.begin();
  view.set('isSelected', YES);
  SC.RunLoop.end();
  ok(view.$().hasClass('sel'), 'precond - should have sel class');

  SC.RunLoop.begin();
  view.set('isSelected', NO);
  SC.RunLoop.end();
  ok(!view.$().hasClass('sel'), 'should no longer have sel class');
});

test("setting isEnabled to NO adds disabled class", function() {
  SC.RunLoop.begin();
  view.set('isEnabled', NO);
  SC.RunLoop.end();
  ok(view.$().hasClass('disabled'), 'should have disabled class');

  SC.RunLoop.begin();
  view.set('isEnabled', YES);
  SC.RunLoop.end();
  ok(!view.$().hasClass('disabled'), 'should remove disabled class');
});

test("should gain focus class if isFirstResponder", function() {
  SC.RunLoop.begin();
  view.set('isFirstResponder', YES);
  SC.RunLoop.end();
  ok(view.$().hasClass('focus'), 'should have focus class');

  SC.RunLoop.begin();
  view.set('isFirstResponder', NO);
  SC.RunLoop.end();
  ok(!view.$().hasClass('focus'), 'should remove focus class');
});

test("should gain active class if isActive", function() {
  SC.RunLoop.begin();
  view.set('isActive', YES);
  SC.RunLoop.end();
  ok(view.$().hasClass('active'), 'should have active class');

  SC.RunLoop.begin();
  view.set('isActive', NO);
  SC.RunLoop.end();
  ok(!view.$().hasClass('active'), 'should remove active class');
});

test("should get controlSize class on init", function() {
  ok(view.$().hasClass(SC.REGULAR_CONTROL_SIZE), 'should have regular control size class');
});


