// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test htmlbody ok equals same stop start */
var pane, view, view1, view2 ;
module("SC.ScrollerView",{
  setup: function() {
    SC.RunLoop.begin();
	pane = SC.MainPane.create({
	  childViews: [
	    SC.ScrollerView.extend({
		}),
		SC.ScrollerView.extend({
		  minimum:10,
		  maximum:100,
		  isEnabled:NO,
		  layoutDirection: SC.LAYOUT_HORIZONTAL
		}),
		SC.ScrollerView.extend({
      layout:{ top: 0, bottom: 0, right: 0, width: 20 },
		  minimum:0,
		  maximum:100,
		  hasButtons: NO
		})

	  ]
	});
	pane.append(); // make sure there is a layer...
	SC.RunLoop.end();
	view = pane.childViews[0];
	view1= pane.childViews[1];
  view2= pane.childViews[2];
  },

  teardown: function() {
   	pane.remove();
   	pane = view = null ;
  }
});

test('value', function() {
  equals(view1.get('maximum'), 100, 'precond - view has maximum of 100');
  equals(view1.get('minimum'), 10, 'precond - view has a minimum of 10');
  view1.set('value', 300);
  equals(view1.get('value'), view1.get('maximum'), 'value is set to maximum if attempting to set higher than maximum');
  view1.set('maximum', 50);
  equals(view1.get('value'), view1.get('maximum'), 'value should change if maximum changes');
  view1.set('value', 0);
  equals(view1.get('value'), view1.get('minimum'), 'value is set to minimum if attempt to set lower than minimum');
  view1.set('minimum', 15);
  equals(view1.get('value'), view1.get('minimum'), 'value should change if minimum changes');
});

test('isEnabled', function() {
  ok(!view.$().hasClass('disabled'), 'scrollers should be enabled by default');
  view.set('isEnabled', NO);
  SC.RunLoop.begin().end();
  ok(view.$().hasClass('disabled'), 'scrollers should have disabled class set if isEnabled is set to NO');

  var layer = view.$('.button-down'),
      evt = SC.Event.simulateEvent(layer, 'mousedown'),
      scrollerHeight = view.get('frame').height;

  view.set('maximum', scrollerHeight+100);
  view.set('value', 500);
  SC.Event.trigger(layer, 'mousedown', [evt]);
  equals(view.get('value'), 500, 'scrollers should not respond to mouse events if they are disabled');
  view.set('isEnabled', YES);
  SC.Event.trigger(layer, 'mousedown', [evt]);
  ok(view.get('value') < (scrollerHeight+100), 'scrollers should respond to mouse events if they are not disabled');
});

test('layoutDirection', function() {
  equals(view.get('layoutDirection'), SC.LAYOUT_VERTICAL, 'scrollers should default to vertical direction');
  ok(view.$().hasClass('sc-vertical'), 'scroller with vertical layoutDirection has sc-vertical class name');
  equals(view1.get('layoutDirection'), SC.LAYOUT_HORIZONTAL, 'precond - view1 has horizontal direction');
  ok(view1.$().hasClass('sc-horizontal'), 'scroller with horizontal layoutDirection has sc-horizontal class name');
});

test('hasButtons', function() {
  equals(view.get('hasButtons'), YES, 'scrollers should default to having buttons');
  equals(view.$('.endcap').length, 0, 'scrollers with buttons should not have an endcap');
  equals(view.$('.button-bottom, .button-top').length, 2, 'scrollers with buttons should have an up and a down button');
  equals(view2.$('.endcap').length, 1, 'scrollers with buttons should have an endcap');
  equals(view2.$('.button-bottom, .button-top').length, 0, 'scrollers with buttons should not have an up or a down button');  
});

test('hasThumb', function() {
  equals(view.$('.thumb').height(), view.get('thumbLength'),  'vertical scroller should have the right height');
  equals(view1.$('.thumb').width(), view1.get('thumbLength'), 'horizontal scroller should have the right width');
});

test('aria-role', function() {
  var viewElem = view.$();
  equals(viewElem.attr('role'), 'scrollbar', 'aria role set to the scroller');
});

test('aria-orientation', function(){
  var viewElem = view.$();
  equals(viewElem.attr('aria-orientation'), 'vertical', 'default aria-orientation should be vertical');
});

test('aria-valuemax', function(){
  var viewElem = view1.$();
  equals(viewElem.attr('aria-valuemax'), 100, 'aria-maximum attribute should be 100');
});

test('aria-valuemin', function(){
  var viewElem = view1.$();
  equals(viewElem.attr('aria-valuemin'), 10, 'aria-min attribute should be 10');
});

test('aria-valuenow', function(){
  var viewElem;
  view2.set('value', 80);
  SC.RunLoop.begin().end();
  viewElem = view2.$();
  equals(viewElem.attr('aria-valuenow'), 80, 'aria-now attribute should be 10');
});
