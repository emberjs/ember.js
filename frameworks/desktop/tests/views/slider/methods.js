// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global module test htmlbody ok equals same stop start */


module("SC.SliderView Methods", {
  setup: function() {
    // SC.RunLoop.begin();
    pane = SC.MainPane.create({
      layout: { width: 500 },
      childViews: [
        SC.SliderView.extend({
          value: 50,
          minimum: 0,
          maximum: 100
        })]
    });
    pane.append(); // make sure there is a layer...
    // SC.RunLoop.end();

    view = pane.childViews[0];
  },

  teardown: function() {
    pane.remove();
    pane = view = null ;
  }
});

test("changing value of the slider will change its left position", function() {
  equals(view.get('value'), 50, 'precond - value should be 50');
  equals(parseFloat(view.$('.sc-handle').css('left')), 250, 'left of sc-handle should be 50%');

  var elem = view.get('layer');

  SC.RunLoop.begin();
  view.set('value', 100);
  SC.RunLoop.end();

  equals(view.get('value'), 100, 'value should now be 100');
  equals(parseFloat(view.$('.sc-handle').css('left')), 500, 'left of sc-handle should be 100%');

});

test("going over maximum slider limit", function() {
  equals(view.get('value'), 50, 'precond - value should be 50');

  var elem = view.get('layer');

  SC.RunLoop.begin();
  view.set('value', 150);
  SC.RunLoop.end();

  // TODO: should we allow setting value higher then maximum?
  equals(view.get('value'), 150, 'value should now be 150');
  equals(parseFloat(view.$('.sc-handle').css('left')), 500, 'left of sc-handle should be 100%');
});

test("going below minimum slider limit", function() {
  equals(view.get('value'), 50, 'precond - value should be 50');

  var elem = view.get('layer');

  SC.RunLoop.begin();
  view.set('value', -10);
  SC.RunLoop.end();

  // TODO: should we allow setting value lower then minimum?
  equals(view.get('value'), -10, 'value should now be -10');
  equals(parseFloat(view.$('.sc-handle').css('left')), 0, 'left of sc-handle should be 0%');
});
