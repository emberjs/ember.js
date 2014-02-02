// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
var view, pane, contentA, contentB;

module('ContentDisplay', {
  setup: function () {
    contentA = SC.Object.create({
      foo: 'foo.A',
      bar: 'bar.A'
    });

    contentB = SC.Object.create({
      foo: 'foo.B',
      bar: 'bar.B'
    });

    pane = SC.Pane.create();
    view = SC.View.create(SC.ContentDisplay, {
      contentDisplayProperties: ['foo', 'bar'],
      content: contentA
    });
    pane.appendChild(view);
    pane.append();
  },

  teardown: function () {
    pane.destroy();
    contentA.destroy();
    contentB.destroy();
    pane = view = contentA = contentB = null;
  }
});

test('should dirty layer when content changes', function () {
  SC.run(function () {
    view.set('content', contentB);

    ok(view.get('layerNeedsUpdate'), "The view's layerNeedsUpdate should be true.");
  });
});

test('should dirty layer when any of contentDisplayProperties change', function () {
  SC.run(function () {
    contentA.set('foo', 'newFoo');

    ok(view.get('layerNeedsUpdate'), "The view's layerNeedsUpdate should be true.");
  });
});

test('should stop observing old content when content changes', function () {
  ok(contentA.hasObserverFor('*'));
  view.set('content', contentB);

  ok(!contentA.hasObserverFor('*'));
});

test('should begin observing new content when content changes', function () {
  view.set('content', contentB);
  view.set('layerNeedsUpdate', NO);
  SC.run(function () {
    contentB.set('bar', 'newBar');

    ok(view.get('layerNeedsUpdate'), "The view's layerNeedsUpdate should be true.");
  });
});

test('should stop observing content when destroyed', function () {
  ok(contentA.hasObserverFor('*'));
  view.destroy();
  ok(!contentA.hasObserverFor('*'));
});
