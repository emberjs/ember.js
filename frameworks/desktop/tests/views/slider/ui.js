// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test htmlbody ok equals same stop start */

(function() {
var pane = SC.ControlTestPane.design()
  .add("slider basic", SC.SliderView, {
    layout: {top:0, bottom:0, left:0, width: 250},
    value: 50,
    minimum: 0,
    maximum: 100
  })
  .add("slider disabled", SC.SliderView, {
    layout: {top:0, bottom:0, left:0, width: 250},
    value: 50,
    minimum: 0,
    maximum: 100,
    isEnabled: NO
  })
  .add("slider value 100", SC.SliderView, {
    layout: {top:0, bottom:0, left:0, width: 250},
    value: 100,
    minimum: 0,
    maximum: 100
  })
  .add("slider basic step 20", SC.SliderView, {
    layout: {top:0, bottom:0, left:0, width: 250},
    value: 50,
    minimum: 0,
    maximum: 100,
    step: 20
  })
  .add("slider aria-role", SC.SliderView, {
    layout: {top:0, bottom:0, left:0, width: 250},
    value: 10,
    minimum: 0,
    maximum: 50
  })
  .add("slider aria-valuemax", SC.SliderView, {
    layout: {top:0, bottom:0, left:0, width: 250},
    value: 40,
    minimum: 0,
    maximum: 100
  })
  .add("slider aria-valuemin", SC.SliderView, {
    layout: {top:0, bottom:0, left:0, width: 250},
    value: 20,
    minimum: 0,
    maximum: 100
  })
  .add("slider aria-valuenow", SC.SliderView, {
    layout: {top:0, bottom:0, left:0, width: 250},
    value: 40,
    minimum: 0,
    maximum: 100
  })
  .add("slider aria-valuetext", SC.SliderView, {
    layout: {top:0, bottom:0, left:0, width: 250},
    value: 20,
    minimum: 0,
    maximum: 100
  })
  .add("slider aria-orientation", SC.SliderView, {
    layout: {top:0, bottom:0, left:0, width: 250},
    value: 50,
    minimum: 0,
    maximum: 100
  });

// ..........................................................
// TEST VIEWS
//

module("SC.SliderView UI", pane.standardSetup());

test("basic", function() {
  var view = pane.view('slider basic');

  ok(!view.$().hasClass('disabled'), 'should NOT have disabled class');
  ok(view.$('.track').length > 0, 'should have track classed element');
  ok(view.$('.sc-handle').length > 0, 'should have sc-handle classed element');
  equals(view.$('.sc-handle')[0].style.left, '50%', 'left of sc-handle should be 50%');
});

test("disabled", function() {
  var view = pane.view('slider disabled');

  ok(view.$().hasClass('disabled'), 'should have disabled class');
  ok(view.$('.track').length > 0, 'should have track classed element');
  ok(view.$('.sc-handle').length > 0, 'should have sc-handle classed element');
  equals(view.$('.sc-handle')[0].style.left, '50%', 'left of sc-handle should be 50%');
});

test("basic value 100", function() {
  var view = pane.view('slider value 100');

  ok(!view.$().hasClass('disabled'), 'should have disabled class');
  ok(view.$('.track').length > 0, 'should have track classed element');
  ok(view.$('.sc-handle').length > 0, 'should have sc-handle classed element');
  equals(view.$('.sc-handle')[0].style.left, '100%', 'left of sc-handle should be 100%');
});

test("basic step 20", function() {
  var view = pane.view('slider basic step 20');

  ok(!view.$().hasClass('disabled'), 'should have disabled class');
  ok(view.$('.track').length > 0, 'should have track classed element');
  ok(view.$('.sc-handle').length > 0, 'should have sc-handle classed element');
  equals(view.$('.sc-handle')[0].style.left, '60%', 'left of sc-handle should be 60%');
});

test("Check if aria role is set to slider view", function() {
  var viewElem = pane.view('slider aria-role').$();
  ok(viewElem.attr('role') === 'slider', 'aria-role is set to the slider  view');
});

test("Check if attribute aria-valuemax is set correctly", function() {
  var viewElem = pane.view('slider aria-valuemax').$();
  equals(viewElem.attr('aria-valuemax'), 100, 'aria-valuemax should be 100');
});

test("Check if attribute aria-valuemin is set correctly", function() {
  var viewElem = pane.view('slider aria-valuemin').$();
  equals(viewElem.attr('aria-valuemin'), 0, 'aria-valuemin should be 0');
});

test("Check if attribute aria-valuenow is set correctly", function() {
  var viewElem = pane.view('slider aria-valuenow').$();
  equals(viewElem.attr('aria-valuenow'), 40, 'aria-valuenow should be 40');
});

test("Check if attribute aria-orientation is set correctly", function() {
  var viewElem = pane.view('slider aria-orientation').$();
  equals(viewElem.attr('aria-orientation'), "horizontal", 'aria-orientation should be horizontal');
});
})();
