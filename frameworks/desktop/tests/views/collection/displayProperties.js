// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


var view ;
module("SC.CollectionView#displayProperties", {
  setup: function() {
    view = SC.CollectionView.create({
        isVisibleInWindow: YES
    }).createLayer();
  },

  teardown: function() {
    view.destroy();
  }
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
