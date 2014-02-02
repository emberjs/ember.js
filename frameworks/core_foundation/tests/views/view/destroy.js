// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/* global module test equals context ok same */

module("SC.View#destroy");

test('isDestroyed works.', function() {
  var v = SC.View.create();
  ok(!v.get('isDestroyed'), 'undestroyed view\'s isDestroyed property is false.');
  v.destroy();
  ok(v.get('isDestroyed'), 'destroyed view\'s isDestroyed property is true.');
});

test('childViews specified as classes are also destroyed.', function() {
  var v = SC.View.create({ childViews: [ SC.View.extend({ childViews: [ SC.View ] }) ] }),
      v2 = v.childViews[0],
      v3 = v2.childViews[0];

  v.destroy();
  ok(v2.get('isDestroyed'), 'destroying a parent also destroys a child, mwaha.');
  ok(v3.get('isDestroyed'), 'destroying a parent also destroys a grandchild, mwaha.');

  SC.run(function() {
    ok(!v2.get('parentView'), 'destroying a parent removes the parentView reference from the child.');
    ok(v2.get('owner') === null, 'destroying a parent removes the owner reference from the child.');
    ok(!v3.get('parentView'), 'destroying a parent removes the parentView reference from the grandchild.');
    ok(v3.get('owner') === null, 'destroying a parent removes the owner reference from the grandchild.');
  });
});

test('childViews specified as instances are also destroyed.', function() {
  var v2 = SC.View.create(),
      v = SC.View.create({ childViews: [v2] });
  v.destroy();
  ok(v2.get('isDestroyed'), 'destroying a parent also destroys a child, mwaha.');

  SC.run(function() {
    ok(!v2.get('parentView'), 'destroying a parent removes the parentView reference from the child.');
    ok(v2.get('owner') === null, 'destroying a parent removes the owner reference from the child.');
  });
});

/**
  There was a bug introduced when we started destroying SC.Binding objects when
  destroying SC.Objects.

  Because the view was overriding destroy to destroy itself first (clearing out
  parentViews), later when we try to clean up bindings, any bindings to the
  parentView property of a view would not be able to remove observers from the
  parent view instance.
*/
test("Destroying a view, should also destroy its binding objects", function () {
  var v, v2;

  SC.run(function() {
    v = SC.View.create({
      childViews: ['v2'],
      foo: 'baz',
      v2: SC.View.extend({
        barBinding: '.parentView.foo'
      })
    });
  });

  v2 = v.get('v2');

  ok(v.hasObserverFor('foo'), "The view should have an observer on 'foo'");
  ok(v2.hasObserverFor('bar'), "The child view should have an observer on 'bar'");

  v.destroy();

  ok(!v.hasObserverFor('foo'), "The view should no longer have an observer on 'foo'");
  ok(!v2.hasObserverFor('bar'), "The child view should no longer have an observer on 'bar'");
});

test('Resigns firstResponder when destroyed.', function() {
  var pane = SC.Pane.create();
  var v = SC.View.create({ parentView: pane, acceptsFirstResponder: YES });
  v.becomeFirstResponder();
  ok(v.get('isFirstResponder'), 'view starts as firstResponder.');
  v.destroy();
  ok(!v.get('isFirstResponder'), 'destroying view resigns firstResponder.');
});
