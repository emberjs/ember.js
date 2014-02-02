// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2010 Sprout Systems, Inc. and contributors.
//            portions copyright ©2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*
  Tests SplitView Thumb views. Specifically, event handling.
  
  Tests:
  
  - mouse events
  - movesChild calculation
  - that mouse events move movesChild
  - cursor style calculation

  This ONLY tests that adjustPositionForChild is called; we do _not_ test
  the positioning logic itself.
*/

var splitView, left, divider1, middle, divider2, right, thumb,
    adjustedChild, adjustedPosition;
module("SplitView Thumb", {
  setup: function() {
    SC.RunLoop.begin();
    splitView = SC.SplitView.create({
      childViews: [ 'left', 'middle', 'right' ],

      left:  SC.View.extend(SC.SplitChild, SC.SplitThumb, { name: 'left', size: 100 }),
      middle: SC.View.extend(SC.SplitChild, SC.SplitThumb, {
        name: 'middle', size: 300,
        childViews: 'thumb'.w(),
        thumb: SC.View.extend(SC.SplitThumb, { layout: { left: 0, width: 100, top:0, height: 100}})
      }),
      right: SC.View.extend(SC.SplitChild, SC.SplitThumb, { name: 'right', size: 100 }),

      layout: { 
        left: 0, top: 0, 
        width: 520,
        height: 300
      },

      splitDividerView: SC.SplitDividerView.design({ size: 10, autoResizeStyle: SC.FIXED_SIZE }),

      adjustPositionForChild: function(child, position) {
        adjustedChild = child;
        adjustedPosition = position;
      }

    });
    SC.RunLoop.end();

    left = splitView.childViews[0];
    divider1 = splitView.childViews[1];
    middle = splitView.childViews[2];
    divider2 = splitView.childViews[3];
    right = splitView.childViews[4];

    thumb = middle.thumb;
  }
});

// event fakers
function md(view, x, y) {
  SC.RunLoop.begin();
  equals(view.mouseDown({ pageX: x, pageY: y }), YES, "Event returns YES");
  SC.RunLoop.end();
}

function mm(view, x, y) {
  SC.RunLoop.begin();
  equals(view.mouseDragged({ pageX: x, pageY: y }), YES, "Event returns YES");
  SC.RunLoop.end();
}

function mu(view, x, y) {
  SC.RunLoop.begin();
  equals(view.mouseUp({ pageX: x, pageY: y }), YES, "Event returns YES");
  SC.RunLoop.end();
}

test("Mouse events trigger adjustment", function() {
  // we always start at 0, even though it is not in-bounds;
  // the code always just checks the difference
  equals(adjustedChild || adjustedPosition, undefined, "Positions not yet adjusted.");

  md(divider1, 0, 0);

  mm(divider1, 10, 0);
  equals(adjustedChild, divider1, "Moved the divider.");
  equals(adjustedPosition, 110, "Divider moved by 10px");

  mu(divider1, 20, 0);
  equals(adjustedChild, divider1, "Moved the divider.");
  equals(adjustedPosition, 120, "Divider moved by 20px");

});

test("movesChild is calculated correctly", function() {
  equals(divider1.get('movesSibling'), SC.MOVES_CHILD, "movesSibling is MOVES_CHILD for divider1");
  equals(divider2.get('movesSibling'), SC.MOVES_CHILD, "movesSibling is MOVES_CHILD for divider2");

  equals(left.get('movesSibling'), SC.MOVES_AUTOMATIC_CHILD, "movesSibling is SC.MOVES_AUTOMATIC_CHILD for left");
  equals(middle.get('movesSibling'), SC.MOVES_AUTOMATIC_CHILD, "movesSibling is SC.MOVES_AUTOMATIC_CHILD for middle");

  equals(divider1.get('movesChild'), divider1, "Divider 1 moves itself.");
  equals(divider2.get('movesChild'), divider2, "Divider 2 moves itself");

  equals(left.get('movesChild'), divider1, "Left moves child to right.");
  equals(middle.get('movesChild'), middle, "Middle moves itself");
  equals(right.get('movesChild'), divider2, "Right moves child to left.");

  equals(thumb.get('movesChild'), middle, "Thumb moves middle");

  // now test as we change the thumb's movesSibling
  thumb.set('movesSibling', SC.MOVES_CHILD);
  equals(thumb.get('movesChild'), middle, "Thumb moves middle");

  thumb.set('movesSibling', SC.MOVES_PREVIOUS_CHILD);
  equals(thumb.get('movesChild'), divider1, "Thumb moves previous child (divider1");

  thumb.set('movesSibling', SC.MOVES_NEXT_CHILD);
  equals(thumb.get('movesChild'), divider2, "Thumb moves next child (divider2");


});

test("mouse events move the movesChild", function() {
  // set directly to override computed property
  // we are completely short-circuiting it.
  divider1.movesChild = divider2;

  md(divider1, 0, 0);
  mm(divider1, 10, 0);
  equals(adjustedChild, divider2, "Attempts to move divider2.");

  // note: it _attempts_ to move to 420; doesn't necessarily succeed.
  equals(adjustedPosition, 420, "Attempts to move divider2 to 420.");
});

test("Cursor style is calculated properly", function() {
  // we test that, as dragging occurs, the cursor style is set on splitView's splitChildCursorStyle
  //
  equals(splitView.get('splitChildCursorStyle'), null, "splitChildCursorStyle should have initial null value.");

  md(divider1, 0, 0);
  equals(splitView.get('splitChildCursorStyle'), 'ew-resize', "should now be ew-resize");

  SC.RunLoop.begin();
  splitView.set('layoutDirection', SC.LAYOUT_VERTICAL);
  SC.RunLoop.end();

  equals(splitView.get('splitChildCursorStyle'), 'ns-resize', "orientation change means ns-resize");
});





