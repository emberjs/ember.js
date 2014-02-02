// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2010 Sprout Systems, Inc. and contributors.
//            portions copyright ©2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*
  Tests SplitView logic responsible for automatically creating divider views.
  There are a few different parts to this:
  
  - The automatic creation of dividers.
  - The splitDividerView property.
  - The splitViewDividerBetween method.

  We don't have to worry about orientation; the code being tested creates
  child views, but does nothing related to laying them out.
  
  Note: We do NOT test the properties added to the split children (nextView, etc.);
  Those are tested in children.js.
  
*/
var createSplitView;

module("SplitView Dividers", {
  setup: function() {
    // Rather than instantiate one here, we'll create a function that
    // instantiates with the supplied options.
    var SplitView = SC.SplitView.extend({
      childViews: [
        'left',
        'right'
      ],
      
      left:  SC.View.extend(SC.SplitChild, { name: 'left', canCollapse: YES, collapseAtSize: 50 }),
      right: SC.View.extend(SC.SplitChild, { name: 'right', canCollapse: YES, collapseAtSize: 50 }),
      
      layout: { left: 0, top: 0, width: 500, height: 500 }
    });
    
    createSplitView = function(opts) {
      opts = opts || {};
      SC.RunLoop.begin();
      var ret = SplitView.create(opts);
      SC.RunLoop.end();
      return ret;
    };
  },
  
  teardown: function() {
    
  }
});

test("SC.SplitDividerView is automatically created between child views", function(){
  var view = createSplitView();
  equals(view.childViews.length, 3, "Should have created 3 views: left, divider, and right.");
  ok(view.childViews[1].kindOf(SC.SplitDividerView), "Middle view is an SC.SplitDividerView");
});

test("SC.SplitDividerView uses splitDividerView property", function(){
  var MyDividerType = SC.SplitDividerView.extend();
  var view = createSplitView({ splitDividerView: MyDividerType });
  equals(view.childViews.length, 3, "Should have created 3 views: left, divider, and right.");
  ok(view.childViews[1].kindOf(MyDividerType), "Middle view is a MyDividerType");
});

test("SC.SplitDividerView uses splitViewDividerBetween method", function(){
  var MyDividerType = SC.SplitDividerView.extend();
  var view = createSplitView({ splitViewDividerBetween: function(split, view1, view2) { return MyDividerType.create(); } });
  equals(view.childViews.length, 3, "Should have created 3 views: left, divider, and right.");
  ok(view.childViews[1].kindOf(MyDividerType), "Middle view is a MyDividerType");
});

test("splitViewDividerBetween works properly", function(){
  var MyDividerType1 = SC.SplitDividerView.extend({ dividerType: 1 });
  var MyDividerType2 = SC.SplitDividerView.extend({ dividerType: 2 });
  
  var view = createSplitView({
    childViews: 'left middle right'.w(),
    middle: SC.View.design(SC.SplitChild, { name: 'middle' }),
    splitViewDividerBetween: function(split, view1, view2) { 
      if (view1 === split.left) return MyDividerType1.create();
      if (view1 === split.middle) return MyDividerType2.create();
    } 
  });
  
  equals(view.childViews.length, 5, "Should have created 5 views: left, divider, middle, divider, and right.");
  ok(view.childViews[1].kindOf(MyDividerType1), "2nd view is a MyDividerType1");
  ok(view.childViews[3].kindOf(MyDividerType2), "4th view is a MyDividerType2");
});

function checkDividers(view, number) {
  var shouldBeDivider = NO;
  
  equals(view.childViews.length, number * 2 - 1, "There should be " + (number * 2 - 1) + " children");
  
  for (var i = 1; i < number; i++) {
    equals(
      view.childViews[i - 1].isSplitDivider, shouldBeDivider, 
      "View " + i + (shouldBeDivider ? " SHOULD " : " SHOULD NOT ") + "be a divider"
    );
    shouldBeDivider = !shouldBeDivider;
  }
}

test("Adding/removing from end adds/removes dividers appropriately", function() {
  var view = createSplitView({
    childViews: 'left middle right'.w(),
    middle: SC.View.design(SC.SplitChild, { name: 'middle' })
  });
  
  // do an initial check: should be three views with dividers.
  checkDividers(view, 3);
  
  // add one, and check again.
  var add = SC.View.create(SC.SplitChild, { name: 'add' });
  
  SC.RunLoop.begin();
  view.appendChild(add);
  SC.RunLoop.end();
  
  checkDividers(view, 4);
  
  // remove the one we added, and check again
  SC.RunLoop.begin();
  view.removeChild(add);
  SC.RunLoop.end();
  
  checkDividers(view, 3);
  
});

test("Adding/removing from beginning adds/removes dividers appropriately", function() {
  var view = createSplitView({
    childViews: 'left middle right'.w(),
    middle: SC.View.design(SC.SplitChild, { name: 'middle' })
  });
  
  // do an initial check: should be three views with dividers.
  checkDividers(view, 3);
  
  // add one, and check again.
  var add = SC.View.create(SC.SplitChild, { name: 'add' });
  
  SC.RunLoop.begin();
  view.insertBefore(add, view.childViews[0]);
  SC.RunLoop.end();
  
  checkDividers(view, 4);
  
  // remove the one we added, and check again
  SC.RunLoop.begin();
  view.removeChild(add);
  SC.RunLoop.end();
  
  checkDividers(view, 3);
  
});

test("Adding/removing in middle adds/removes dividers appropriately", function() {
  var view = createSplitView({
    childViews: 'left middle right'.w(),
    middle: SC.View.design(SC.SplitChild, { name: 'middle' })
  });
  
  // do an initial check: should be three views with dividers.
  checkDividers(view, 3);
  
  // add one, and check again.
  var add = SC.View.create(SC.SplitChild, { name: 'add' });
  
  SC.RunLoop.begin();
  view.insertBefore(add, view.childViews[2]); // note: 2 is the middle view
  SC.RunLoop.end();
  
  checkDividers(view, 4);
  
  // remove the one we added, and check again
  SC.RunLoop.begin();
  view.removeChild(add);
  SC.RunLoop.end();
  
  checkDividers(view, 3);
  
});

test("Adding and removing before a divider doesn't screw things majorly", function() {

  var view = createSplitView({
    childViews: 'left middle right'.w(),
    middle: SC.View.design(SC.SplitChild, { name: 'middle' })
  });

  // do an initial check: should be three views with dividers.
  checkDividers(view, 3);

  // add one, and check again.
  var add = SC.View.create(SC.SplitChild, { name: 'add' });

  SC.RunLoop.begin();
  view.insertBefore(add, view.childViews[1]);
  SC.RunLoop.end();

  checkDividers(view, 4);

  // remove the one we added, and check again
  SC.RunLoop.begin();
  view.removeChild(add);
  SC.RunLoop.end();

  checkDividers(view, 3);

});

test("Adding and removing several views doesn't screw things", function() {
  var view = createSplitView({
    childViews: 'left middle right'.w(),
    middle: SC.View.design(SC.SplitChild, { name: 'middle' })
  });

  // do an initial check: should be three views with dividers.
  checkDividers(view, 3);

  // add one, and check again.
  var add1 = SC.View.create(SC.SplitChild, { name: 'add' });
  var add2 = SC.View.create(SC.SplitChild, { name: 'add' });
  var add3 = SC.View.create(SC.SplitChild, { name: 'add' });
  var add4 = SC.View.create(SC.SplitChild, { name: 'add' });

  SC.RunLoop.begin();
  view.removeChild(view.childViews[2]);
  view.removeChild(view.childViews[3]);
  
  // semi-random (I just picked 4 numbers):
  view.insertBefore(add1, view.childViews[0]);
  view.insertBefore(add2, view.childViews[0]);
  view.insertBefore(add3, view.childViews[4]);
  view.insertBefore(add4, view.childViews[3]);
  SC.RunLoop.end();
  
  checkDividers(view, 5);
});