// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same htmlbody Q$ */

(function() {
  var pane, view, triggered = false;

  module("SC.Checkbox", {
    setup: function() {
      SC.RunLoop.begin();

      // actions must be strings, and there must be a target. So, we need this dummy.
      var act = SC.Object.create({
        action: function() {
          triggered = true;
        }
      });

      pane = SC.MainPane.create({
        childViews: [
          SC.CheckboxView.extend({
            layout: { right: 20, bottom: 20, width: 100, height: 23 },
            title: "First Name",
            value: YES,
            target: act,
            action: 'action'
          })]
      });
      pane.append(); // make sure there is a layer...
      SC.RunLoop.end();

      view = pane.childViews[0];
    }, 

    teardown: function() {
      pane.remove();
      pane = view = null;
      triggered = false;
    }
  });

  test("renders something that is NOT an input tag with appropriate attributes", function() {
    equals(view.get('value'), YES, 'precon - value should be YES');

    var q = view.$();
    equals(q.attr('role'), 'checkbox', 'should have type=checkbox');
    equals(q.attr('aria-checked'), 'true', 'should be checked');
  });

  test("double-check that there is NO input element. Just in case.", function(){
    equals(view.$("input").length, 0, "CoreQuery lookup for inputs should have length of 0.");
  });

  test("should have span with title inside", function() {
    var q = Q$('span', view.get('layer'));
    ok(view.get('displayTitle').length>0, 'precond - display title should not be empty');
    equals(q.text(), view.get('displayTitle'), 'should have display title');
  });

  test("changing the title should update the span", function() {
    var oldDisplayTitle = view.get('displayTitle');
    SC.RunLoop.begin();
    view.set('title', 'Last Name');
    SC.RunLoop.end();

    ok(view.get('displayTitle') !== oldDisplayTitle, 'precond - should have changed display title');

    var q = Q$('span', view.get('layer'));
    equals(q.text(), view.get('displayTitle'), 'should have display title');
  });

  test("isEnabled=NO should add disabled class", function() {
    SC.RunLoop.begin();
    view.set('isEnabled', NO);
    SC.RunLoop.end();

    ok(view.$().hasClass('disabled'), 'should have disabled class');
  });


  test("isSelected should alter sel classname and sync with value property", function() {

    // check initial render state
    ok(view.get('isSelected'), 'isSelected should match value');
    ok(view.$().hasClass('sel'), 'should have sel class');

    // update value -- make sure isSelected changes.  
    SC.RunLoop.begin();
    view.set('value', 0); // make falsy. (but not NO exactly)
    SC.RunLoop.end();

    ok(!view.get('isSelected'), 'isSelected should now be NO');
    ok(!view.$().hasClass('sel'), 'should no longer have sel class');
    equals(view.$().attr('aria-checked'), 'false', 'view should not be checked');

    // update isSelected -- make sure it edits the value
    SC.RunLoop.begin();
    view.set('isSelected', YES);
    SC.RunLoop.end();

    ok(view.get('isSelected'), 'isSelected should match value');
    ok(view.$().hasClass('sel'), 'should have sel class');
    equals(view.$().attr('aria-checked'), 'true', 'aria-checked should be true');
  });

  test("mouseDown and then mouseUp anywhere in the checkbox should toggle the selection", function() {
    var elem = view.get('layer');

    ok(!triggered, 'precond - action should not have been triggered yet');

    SC.Event.trigger(elem, 'mousedown');
    ok(view.get('isActive'), 'view should be active');
    ok(view.get('value'), 'value should not change yet');
    equals(view.$().attr('aria-checked'), 'true', 'aria-checked should be true');

    // simulate mouseUp and browser-native change to control
    SC.Event.trigger(elem,'mouseup');

    ok(!view.get('isActive'), 'view should no longer be active');
    ok(!view.get('value'), 'value should change to NO');
    equals(view.$().attr('aria-checked'), 'false', 'aria-checked should be false');

    ok(triggered, 'action should have been triggered');

    elem = null ;
  });

  test("isEnabled=NO should add disabled attr to input", function() {
    SC.RunLoop.begin();
    view.set('isEnabled', NO);
    SC.RunLoop.end();

    ok(view.get('value'), 'precond - value should be true');
    view.mouseDown();
    view.mouseUp();
    ok(view.get('value'), 'value should not change when clicked');
  });
  
})();
