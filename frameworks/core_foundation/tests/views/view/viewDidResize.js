// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same Q$ htmlbody */

// ..........................................................
// viewDidResize()
//
module("SC.View#viewDidResize");

test("invokes parentViewDidResize on all child views", function() {
  var callCount = 0 ;
  var ChildView = SC.View.extend({
    parentViewDidResize: function() { callCount++; }
  });

  var view = SC.View.create({
    childViews: [ChildView, ChildView, ChildView]
  });

  // now test...
  SC.run(function() { view.viewDidResize(); });
  equals(callCount, 3, 'should invoke parentViewDidResize() on all children');
});

test("parentViewDidResize should only be called when the parent's layout property changes in a manner that may affect child views.", function() {
  var callCount = 0 ;
  var view = SC.View.create({
    // use the callback below to detect when viewDidResize is icalled.
    childViews: [SC.View.extend({
      parentViewDidResize: function() { callCount++; }
    })]
  });

  SC.run(function () { view.set('layout', { top: 10, left: 20, height: 50, width: 40 }); });
  equals(callCount, 1, 'parentViewDidResize should invoke once');

  SC.run(function () { view.adjust('top', 0); });
  equals(callCount, 1, 'parentViewDidResize should invoke once');

  SC.run(function () { view.adjust('height', 60); });
  equals(callCount, 2, 'parentViewDidResize should invoke twice');

  // This is tricky, if the height increases, but the same size border is added, the effective height/width is unchanged.
  SC.run(function () { view.adjust({'height': 70, 'borderTop': 10 }); });
  equals(callCount, 2, 'parentViewDidResize should invoke twice');
});

test("The view's frame should only notify changes when its layout changes if the effective size or position actually change.", function () {
  var view2 = SC.View.create({
      frameCallCount: 0,
      frameDidChange: function() {
        this.frameCallCount++;
      }.observes('frame'),
      viewDidResize: CoreTest.stub('viewDidResize', SC.View.prototype.viewDidResize)
    }),
    view1 = SC.View.create({
      childViews: [view2],
      layout: { width: 200, height: 200 }
    });

  SC.run(function () { view2.set('layout', { height: 50, width: 50 }); });
  equals(view2.get('frameCallCount'), 1, 'frame should have notified changing once.');

  SC.run(function () { view2.adjust('top', 0); });
  equals(view2.get('frameCallCount'), 2, 'frame should have notified changing once.');

  SC.run(function () { view2.adjust('height', 100); });
  equals(view2.get('frameCallCount'), 3, 'frame should have notified changing twice.');

  // Tricky.
  SC.run(function () { view2.adjust({ 'height': 110, 'borderTop': 10, 'top': -10 }); });
  equals(view2.get('frameCallCount'), 4, 'frame should have notified changing twice.');

  SC.run(function () { view2.adjust('width', null); });
  equals(view2.get('frameCallCount'), 5, 'frame should have notified changing thrice.');

  // Tricky.
  SC.run(function () { view2.adjust('width', 200); });
  equals(view2.get('frameCallCount'), 6, 'frame should have notified changing thrice.');
});

test("making sure that the frame value is correct inside viewDidResize()", function() {
  // We want to test to be sure that when the view's viewDidResize() method is
  // called, its frame has been updated.  But rather than run the test inside
  // the method itself, we'll cache a global reference to the then-current
  // value and test it later.
  var cachedFrame;

  var view = SC.View.create({

    layout: { left:0, top:0, width:400, height:400 },

    viewDidResize: function() {
        sc_super();

        // Set a global reference to my frame at this point so that we can
        // test for the correct value later.
        cachedFrame = this.get('frame');
      }
  });


  // Access the frame once before resizing the view, to make sure that the
  // previous value was cached.  That way, when we ask for the frame again
  // after the resize, we can verify that the cache invalidation logic is
  // working correctly.
  var originalFrame = view.get('frame');

  SC.RunLoop.begin();
  view.adjust('height', 314);
  SC.RunLoop.end();

  // Now that we've adjusted the view, the cached view (as it was inside its
  // viewDidResize() method) should be the same value, because the cached
  // 'frame' value should have been invalidated by that point.
  same(view.get('frame').height, cachedFrame.height, 'height');
});


// ..........................................................
// parentViewDidResize()
//
module("SC.View#parentViewDidResize");

test("When parentViewDidResize is called on a view, it should only notify on frame and cascade the call to child views if it will be affected by the parent's resize.", function() {
  var view = SC.View.create({
      // instrument...
      frameCallCount: 0,
      frameDidChange: function() {
        this.frameCallCount++;
      }.observes('frame'),
      viewDidResize: CoreTest.stub('viewDidResize', SC.View.prototype.viewDidResize)
    }),
    parentView = SC.View.create({
      childViews: [view],
      layout: { height: 100, width: 100 }
    });

  // try with fixed layout
  view.set('layout', { top: 10, left: 10, height: 10, width: 10 });
  view.viewDidResize.reset(); view.frameCallCount = 0;
  parentView.adjust({ width: 90, height: 90 });
  view.viewDidResize.expect(0);
  equals(view.frameCallCount, 0, 'should not notify frame changed when isFixedPosition: %@ and isFixedSize: %@'.fmt(view.get('isFixedPosition'), view.get('isFixedSize')));

  // try with flexible height
  view.set('layout', { top: 10, left: 10, bottom: 10, width: 10 });
  view.viewDidResize.reset(); view.frameCallCount = 0;
  parentView.adjust({ width: 80, height: 80 });
  view.viewDidResize.expect(1);
  equals(view.frameCallCount, 1, 'should notify frame changed when isFixedPosition: %@ and isFixedSize: %@'.fmt(view.get('isFixedPosition'), view.get('isFixedSize')));

  // try with flexible width
  view.set('layout', { top: 10, left: 10, height: 10, right: 10 });
  view.viewDidResize.reset(); view.frameCallCount = 0;
  parentView.adjust({ width: 70, height: 70 });
  view.viewDidResize.expect(1);
  equals(view.frameCallCount, 1, 'should notify frame changed when isFixedPosition: %@ and isFixedSize: %@'.fmt(view.get('isFixedPosition'), view.get('isFixedSize')));

  // try with right align
  view.set('layout', { top: 10, right: 10, height: 10, width: 10 });
  view.viewDidResize.reset(); view.frameCallCount = 0;
  parentView.adjust({ width: 60, height: 60 });
  view.viewDidResize.expect(0);
  equals(view.frameCallCount, 1, 'right align: should notify frame changed when isFixedPosition: %@ and isFixedSize: %@'.fmt(view.get('isFixedPosition'), view.get('isFixedSize')));

  // try with bottom align
  view.set('layout', { left: 10, bottom: 10, height: 10, width: 10 });
  view.viewDidResize.reset(); view.frameCallCount = 0;
  parentView.adjust({ width: 50, height: 50 });
  view.viewDidResize.expect(0);
  equals(view.frameCallCount, 1, 'bottom align: should notify frame changed when isFixedPosition: %@ and isFixedSize: %@'.fmt(view.get('isFixedPosition'), view.get('isFixedSize')));

  // try with center horizontal align
  view.set('layout', { centerX: 10, top: 10, height: 10, width: 10 });
  view.viewDidResize.reset(); view.frameCallCount = 0;
  parentView.adjust({ width: 40, height: 40 });
  view.viewDidResize.expect(0);
  equals(view.frameCallCount, 1, 'centerX: should notify frame changed when isFixedPosition: %@ and isFixedSize: %@'.fmt(view.get('isFixedPosition'), view.get('isFixedSize')));

  // try with center vertical align
  view.set('layout', { left: 10, centerY: 10, height: 10, width: 10 });
  view.viewDidResize.reset(); view.frameCallCount = 0;
  parentView.adjust({ width: 30, height: 30 });
  view.viewDidResize.expect(0);
  equals(view.frameCallCount, 1, 'centerY: should notify frame changed when isFixedPosition: %@ and isFixedSize: %@'.fmt(view.get('isFixedPosition'), view.get('isFixedSize')));
});

// ..........................................................
// beginLiveResize()
//
module("SC.View#beginLiveResize");

test("invokes willBeginLiveResize on receiver and any child views that implement it", function() {
  var callCount = 0;
  var ChildView = SC.View.extend({
    willBeginLiveResize: function() { callCount++ ;}
  });

  var view = ChildView.create({ // <-- has callback
    childViews: [SC.View.extend({ // <-- this does not implement callback
      childViews: [ChildView] // <-- has callback
    })]
  });

  callCount = 0 ;
  view.beginLiveResize();
  equals(callCount, 2, 'should invoke willBeginLiveResize when implemented');
});

test("returns receiver", function() {
  var view = SC.View.create();
  equals(view.beginLiveResize(), view, 'returns receiver');
});

// ..........................................................
// endLiveResize()
//
module("SC.View#endLiveResize");

test("invokes didEndLiveResize on receiver and any child views that implement it", function() {
  var callCount = 0;
  var ChildView = SC.View.extend({
    didEndLiveResize: function() { callCount++; }
  });

  var view = ChildView.create({ // <-- has callback
    childViews: [SC.View.extend({ // <-- this does not implement callback
      childViews: [ChildView] // <-- has callback
    })]
  });

  callCount = 0 ;
  view.endLiveResize();
  equals(callCount, 2, 'should invoke didEndLiveResize when implemented');
});

test("returns receiver", function() {
  var view = SC.View.create();
  equals(view.endLiveResize(), view, 'returns receiver');
});
