// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same Q$ htmlbody */

/*
  We call RootResponder's browser event handlers directly with fake browser events. These
  tests are to prove RootResponder's downstream behavior.
  
  Our test pane has a view tree like so:

  pane
   |--view1
   |  |--view1a
   |  |--view1b
   |--view2

  Simulating responder-chain events on view1a allows us to ensure that view1 also receives
  the event, but that view1b and view2 do not.
*/


// If we don't factory it, all the views share the same stub functions ergo the same callCounts.
function viewClassFactory() {
  return SC.View.extend({
    // Mouse
    mouseEntered: CoreTest.stub(),
    mouseMoved: CoreTest.stub(),
    mouseExited: CoreTest.stub(),
    // Click
    mouseDown: CoreTest.stub(),
    mouseUp: CoreTest.stub(),
    click: CoreTest.stub(),
    dblClick: CoreTest.stub(),
    // Touch
    touchDown: CoreTest.stub(),
    touchesMoved: CoreTest.stub(),
    touchUp: CoreTest.stub(),
    // Data
    dataDragEntered: CoreTest.stub(),
    dataDragHovered: CoreTest.stub(),
    dataDragExited: CoreTest.stub(),
    dataDragDropped: CoreTest.stub()
  });  
}

var Pane = SC.MainPane.extend({
  childViews: ['view1', 'view2'],
  view1: viewClassFactory().extend({
    childViews: ['view1a', 'view1b'],
    view1a: viewClassFactory(),
    view1b: viewClassFactory()
  }),
  view2: viewClassFactory()
});

var pane, view1, view1a, view1b, view2, evt1a, evt2;

module("Mouse event handling", {
  setup: function() {
    SC.run(function() {
      pane = Pane.create().append();
    });
    // Populate the variables for easy access.
    view1 = pane.get('view1');
    view1a = view1.get('view1a');
    view1b = view1.get('view1b');
    view2 = pane.get('view2');
    // Create the events.
    evt1a = {
      target: pane.getPath('view1.view1a.layer'),
      dataTransfer: { types: [] },
      preventDefault: CoreTest.stub(),
      stopPropagation: CoreTest.stub()
    };
    evt2 = {
      target: pane.getPath('view2.layer'),
      dataTransfer: { types: [] },
      preventDefault: CoreTest.stub(),
      stopPropagation: CoreTest.stub()
    };
  },
  teardown: function() {
    pane.remove();
    pane.destroy();
    pane = null;
    view1 = view1a = view1b = view2 = null;
    evt1a = evt2 = null;
  }
});

test('Mouse movement', function() {
  // Make sure we're all at zero.
  // mouseEntered
  var isGood = YES &&
    view1.mouseEntered.callCount === 0 &&
    view1a.mouseEntered.callCount === 0 &&
    view1b.mouseEntered.callCount === 0 &&
    view2.mouseEntered.callCount === 0;
  ok(isGood, 'PRELIM: mouseEntered has not been called.');
  // mouseMoved
  isGood = YES &&
    view1.mouseMoved.callCount === 0 &&
    view1a.mouseMoved.callCount === 0 &&
    view1b.mouseMoved.callCount === 0 &&
    view2.mouseMoved.callCount === 0;
  ok(isGood, 'PRELIM: mouseMoved has not been called.');
  // mouseExited
  isGood = YES &&
    view1.mouseExited.callCount === 0 &&
    view1a.mouseExited.callCount === 0 &&
    view1b.mouseExited.callCount === 0 &&
    view2.mouseExited.callCount === 0;
  ok(isGood, 'PRELIM: mouseExited has not been called.');


  // Move the mouse over view1a to trigger mouseEntered.
  SC.RootResponder.responder.mousemove(evt1a);

  equals(view1a.mouseEntered.callCount, 1, "The targeted view has received mouseEntered");
  equals(view1.mouseEntered.callCount, 1, "The targeted view's parent has received mouseEntered");
  equals(view1b.mouseEntered.callCount, 0, "The targeted view's sibling has NOT received mouseEntered");
  equals(view2.mouseEntered.callCount, 0, "The targeted view's parent's sibling has NOT received mouseEntered");

  isGood = YES &&
    view1.mouseMoved.callCount === 0 &&
    view1a.mouseMoved.callCount === 0 &&
    view1b.mouseMoved.callCount === 0 &&
    view2.mouseMoved.callCount === 0 &&
    view1.mouseExited.callCount === 0 &&
    view1a.mouseExited.callCount === 0 &&
    view1b.mouseExited.callCount === 0 &&
    view2.mouseExited.callCount === 0;
  ok(isGood, 'No views have received mouseMoved or mouseExited.');


  // Move the mouse over view1a again to trigger mouseMoved.
  SC.RootResponder.responder.mousemove(evt1a);

  equals(view1a.mouseMoved.callCount, 1, "The targeted view has received mouseMoved");
  equals(view1.mouseMoved.callCount, 1, "The targeted view's parent has received mouseMoved");
  equals(view1b.mouseMoved.callCount, 0, "The targeted view's sibling has NOT received mouseMoved");
  equals(view2.mouseMoved.callCount, 0, "The targeted view's parent's sibling has NOT received mouseMoved");

  isGood = YES &&
    view1.mouseEntered.callCount === 1 &&
    view1a.mouseEntered.callCount === 1 &&
    view1b.mouseEntered.callCount === 0 &&
    view2.mouseEntered.callCount === 0;
  ok(isGood, "No views have received duplicate or out-of-place mouseEntered.");
  isGood = YES &&
    view1.mouseExited.callCount === 0 &&
    view1a.mouseExited.callCount === 0 &&
    view1b.mouseExited.callCount === 0 &&
    view2.mouseExited.callCount === 0;
  ok(isGood, 'No views have received mouseExited.');

  // Move the mouse over view2 to trigger mouseExited on the initial responder chain.
  SC.RootResponder.responder.mousemove(evt2);
  equals(view1a.mouseExited.callCount, 1, "The targeted view has received mouseExited");
  equals(view1.mouseExited.callCount, 1, "The targeted view's parent has received mouseExited");
  equals(view1b.mouseExited.callCount, 0, "The targeted view's sibling has NOT received mouseExited");
  equals(view2.mouseExited.callCount, 0, "The targeted view's parent's sibling (the new target) has NOT received mouseExited");
  equals(view2.mouseEntered.callCount, 1, "The new target has received mouseEntered; circle of life");
});

/*
TODO: Mouse clicks.
*/

/*
TODO: Touch.
*/

test('Data dragging', function() {
  // For this test, we also want to test the default responder actions.
  var previousDefaultResponder = SC.RootResponder.responder.defaultResponder;
  var defaultResponder = SC.RootResponder.responder.defaultResponder = SC.Object.create({
    dataDragDidEnter: CoreTest.stub(),
    dataDragDidHover: CoreTest.stub(),
    dataDragDidExit: CoreTest.stub(),
    dataDragDidDrop: CoreTest.stub()
  });

  // Make sure we're all at zero.
  // dataDragEntered
  var isGood = YES &&
    view1.dataDragEntered.callCount === 0 &&
    view1a.dataDragEntered.callCount === 0 &&
    view1b.dataDragEntered.callCount === 0 &&
    view2.dataDragEntered.callCount === 0;
  ok(isGood, 'PRELIM: dataDragEntered has not been called.');
  // dataDragHovered
  isGood = YES &&
    view1.dataDragHovered.callCount === 0 &&
    view1a.dataDragHovered.callCount === 0 &&
    view1b.dataDragHovered.callCount === 0 &&
    view2.dataDragHovered.callCount === 0;
  ok(isGood, 'PRELIM: dataDragHovered has not been called.');
  // dataDragExited
  isGood = YES &&
    view1.dataDragExited.callCount === 0 &&
    view1a.dataDragExited.callCount === 0 &&
    view1b.dataDragExited.callCount === 0 &&
    view2.dataDragExited.callCount === 0;
  ok(isGood, 'PRELIM: dataDragExited has not been called.');


  // Drag the mouse over view1a to trigger mouseEntered.
  evt1a.type = 'dragenter';
  SC.RootResponder.responder.dragenter(evt1a);

  // Test default responder.
  equals(defaultResponder.dataDragDidEnter.callCount, 1, "The default responder was notified that a drag began over the app");
  equals(defaultResponder.dataDragDidHover.callCount, 1, "The default responder received dataDragDidHover immediately after dataDragDidEnter");
  equals(defaultResponder.dataDragDidExit.callCount, 0, "The default responder has NOT received dataDragDidExit");

  // Test the views.
  equals(view1a.dataDragEntered.callCount, 1, "The targeted view has received dataDragEntered");
  equals(view1a.dataDragHovered.callCount, 1, "The targeted view has received initial dataDragHovered");
  equals(view1.dataDragEntered.callCount, 1, "The targeted view's parent has received dataDragEntered");
  equals(view1.dataDragHovered.callCount, 1, "The targeted view's parent has received initial dataDragHovered");
  equals(view1b.dataDragEntered.callCount + view1b.dataDragHovered.callCount, 0, "The targeted view's sibling has NOT received dataDragEntered or dataDragHovered");
  equals(view2.dataDragEntered.callCount + view2.dataDragHovered.callCount, 0, "The targeted view's parent's sibling has NOT received dataDragEntered or dataDragHovered");

  isGood = YES &&
    view1.dataDragExited.callCount === 0 &&
    view1a.dataDragExited.callCount === 0 &&
    view1b.dataDragExited.callCount === 0 &&
    view2.dataDragExited.callCount === 0;
  ok(isGood, 'No views have received dataDragExited.');


  // Hover the drag and make sure only dataDragHovered is called.
  evt1a.type = 'dragover';
  SC.RootResponder.responder.dragover(evt1a);

  // Test the default responder.
  equals(defaultResponder.dataDragDidEnter.callCount, 1, "The default responder did NOT receive additional dataDragDidEnter on hover");
  equals(defaultResponder.dataDragDidHover.callCount, 2, "The default responder received additional dataDragDidHover on hover");
  equals(defaultResponder.dataDragDidExit.callCount, 0, "The default responder has NOT received dataDragDidExit on hover");

  // Test the views.
  equals(view1a.dataDragHovered.callCount, 2, "The targeted view has received another dataDragHovered");
  equals(view1.dataDragHovered.callCount, 2, "The targeted view's parent has received another dataDragHovered");
  equals(view1b.dataDragHovered.callCount, 0, "The targeted view's sibling has NOT received dataDragHovered");
  equals(view2.dataDragHovered.callCount, 0, "The targeted view's parent's sibling has NOT received dataDragHovered");
  equals(view1b.dataDragEntered.callCount + view1b.dataDragHovered.callCount, 0, "The targeted view's sibling has NOT received dataDragEntered or dataDragHovered");
  equals(view2.dataDragEntered.callCount + view2.dataDragHovered.callCount, 0, "The targeted view's parent's sibling has NOT received dataDragEntered or dataDragHovered");

  isGood = YES &&
    view1.dataDragEntered.callCount === 1 &&
    view1a.dataDragEntered.callCount === 1 &&
    view1b.dataDragEntered.callCount === 0 &&
    view2.dataDragEntered.callCount === 0;
  ok(isGood, "No views have received duplicate or out-of-place dataDragEntered.");
  isGood = YES &&
    view1.dataDragExited.callCount === 0 &&
    view1a.dataDragExited.callCount === 0 &&
    view1b.dataDragExited.callCount === 0 &&
    view2.dataDragExited.callCount === 0;
  ok(isGood, 'No views have received dataDragExited.');


  // Leave view1a and enter view2 to trigger dataDragExited on the initial responder chain.
  // Note that browsers call the new dragenter prior to the old dragleave.
  evt2.type = 'dragenter';
  evt1a.type = 'dragleave';
  SC.RootResponder.responder.dragenter(evt2);
  SC.RootResponder.responder.dragleave(evt1a);

  // Check the default responder.
  equals(defaultResponder.dataDragDidEnter.callCount, 1, "The default responder did NOT receive additional dataDragDidEnter on internal events");
  equals(defaultResponder.dataDragDidHover.callCount, 4, "The default responder has received dataDragDidHover for each subsequent drag event");
  equals(defaultResponder.dataDragDidExit.callCount, 0, "The default responder has NOT received dataDragDidExit on internal events");

  // Check the views.
  equals(view1a.dataDragExited.callCount, 1, "The targeted view has received dataDragExited");
  equals(view1.dataDragExited.callCount, 1, "The targeted view's parent has received dataDragExited");
  equals(view1b.dataDragExited.callCount, 0, "The targeted view's sibling has NOT received dataDragExited");
  equals(view2.dataDragExited.callCount, 0, "The targeted view's parent's sibling (the new target) has NOT received dataDragExited");
  equals(view2.dataDragEntered.callCount, 1, "The new target has received dataDragEntered; circle of life");


  // Leave view2 to test document leaving.
  evt2.type = 'dragleave';
  SC.RootResponder.responder.dragleave(evt2);

  // Check the default responder.
  equals(defaultResponder.dataDragDidEnter.callCount, 1, "The default responder did NOT receive additional dataDragDidEnter on document exit");
  equals(defaultResponder.dataDragDidHover.callCount, 5, "The default responder received an additional dataDragDidHover event on document exit");
  equals(defaultResponder.dataDragDidExit.callCount, 1, "The default responder received dataDragDidExit on document exit");

  // Check the views.
  equals(view1a.dataDragExited.callCount, 1, "The previously-targeted view has NOT received additional dataDragExited on document exit");
  equals(view1.dataDragExited.callCount, 1, "The previously-targeted view's parent has received dataDragExited");
  equals(view1b.dataDragExited.callCount, 0, "The previously-targeted view's sibling has NOT received dataDragExited ever basically");
  equals(view2.dataDragEntered.callCount, 1, "The new target has NOT received additional dataDragEntered on document exit");
  equals(view2.dataDragExited.callCount, 1, "The new target has received dataDragExited on document exit");


  // TODO: Test the 300ms timer to make sure the force-drag-leave works for Firefox (et al. probably).


  // Test drop.
  evt1a.type = 'dragenter';
  SC.RootResponder.responder.dragenter(evt1a);
  evt1a.type = 'dragdrop';
  SC.RootResponder.responder.drop(evt1a);

  // Check the default responder.
  equals(defaultResponder.dataDragDidDrop.callCount, 1, "The default responder received a dataDragDidDrop event on drop");

  // Check the views.
  equals(view1a.dataDragDropped.callCount, 1, "The targeted view received a dataDragDropped event");
  equals(view1.dataDragDropped.callCount, 0, "The targeted view's parent did not receive a dataDragDropped event");


  // Clean up our default responder sitch.
  SC.RootResponder.responder.defaultResponder.destroy();
  SC.RootResponder.responder.defaultResponder = previousDefaultResponder;
});

test('Data dragging content types', function() {
  // Drag the event over view 1a with type 'Files' (should cancel).
  evt1a.dataTransfer.types = ['Files'];
  evt1a.dataTransfer.dropEffect = 'copy';
  SC.RootResponder.responder.dragover(evt1a);

  equals(evt1a.preventDefault.callCount, 1, "The default behavior was prevented for a 'Files' drag");
  equals(evt1a.dataTransfer.dropEffect, 'none', "The drop effect was set to 'none' for a 'Files' drag");

  // Drag the event over view 1a with type 'text/uri-list' (should cancel).
  evt1a.dataTransfer.types = ['text/uri-list'];
  evt1a.dataTransfer.dropEffect = 'copy';
  SC.RootResponder.responder.dragover(evt1a);

  equals(evt1a.preventDefault.callCount, 2, "The default behavior was prevented for a 'text/uri-list' drag");
  equals(evt1a.dataTransfer.dropEffect, 'none', "The drop effect was set to 'none' for a 'text/uri-list' drag");

  // Drag the event over view 1a with type 'text/plain' (should not cancel).
  evt1a.dataTransfer.types = ['text/plain'];
  evt1a.dataTransfer.dropEffect = 'copy';
  SC.RootResponder.responder.dragover(evt1a);

  equals(evt1a.preventDefault.callCount, 2, "The default behavior was NOT prevented for a 'text/plain' drag");
  equals(evt1a.dataTransfer.dropEffect, 'copy', "The drop effect was NOT changed for a 'text/plain' drag");

});
