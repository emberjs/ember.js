// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same */

module("SC.View#init");

test("registers view in the global views hash using layerId for event targeted", function () {
  var v = SC.View.create();
  equals(SC.View.views[v.get('layerId')], v, 'registers view');
});

test("adds displayDidChange observer on all display properties (when rendered)", function () {
  var didChange = NO;
  var v = SC.View.create({
    // override just to make sure the registration works...
    displayDidChange: function () { didChange = YES; },

    displayProperties: 'foo bar'.w(),

    foo: 'foo',
    bar: 'bar'
  });

  v.set('foo', 'baz');
  ok(!didChange, '!didChange on set(foo) before view is rendered');
  didChange = NO;

  v.set('bar', 'baz');
  ok(!didChange, '!didChange on set(bar) before view is rendered');

  // Render the view.
  v._doRender();

  v.set('foo', 'buz');
  ok(didChange, 'didChange on set(foo) after view is rendered');
  didChange = NO;

  v.set('bar', 'buz');
  ok(didChange, 'didChange on set(bar) after view is rendered');
});

test("invokes createChildViews()", function () {
  var didInvoke = NO;
  var v = SC.View.create({
    // override just for test
    createChildViews: function () { didInvoke = YES; }
  });
  ok(didInvoke, 'did invoke createChildViews()');
});

test("does NOT create layer", function () {
  var v = SC.View.create();
  equals(v.get('layer'), null, 'did not create layer');
});


