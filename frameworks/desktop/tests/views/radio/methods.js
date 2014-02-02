// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test htmlbody ok equals same stop start Q$*/

var pane, view ;
module("SC.RadioView Logic", {
  setup: function() {
    SC.RunLoop.begin();
    pane = SC.MainPane.create({
      childViews: [
        SC.RadioView.extend({
          layout: { right: 20, bottom: 20, width: 100, height: 23 },
          items: 'Red Green'.w(),
          value: 'Red',
          isEnabled: YES
        }),
        SC.RadioView.extend({
          layout: { right: 20, bottom: 20, width: 100, height: 23 },
          itemTitleKey: 'title',
          itemIsEnabledKey: 'enabled',
          items: [{
            title: 'Sugar',
            enabled: NO
          }, {
            title: 'Salt',
            enabled: NO
          }, {
            title: 'Salgar',
            enabled: YES
          }]
        })]
    });
    pane.append(); // make sure there is a layer...
    SC.RunLoop.end();

    view = pane.childViews[0];
  },

  teardown: function() {
    pane.remove();
    pane = view = null ;
  }
});

test("renders an input tag with appropriate attributes", function() {
  equals(view.get('value'), 'Red', 'precon - value should be YES');

  var q = view.$();
  equals(q.attr('role'), 'radiogroup', 'should have role=radio');
  var radios=view.$('.sc-radio-button');
  equals(SC.$(radios[0]).attr('aria-checked'), 'true', 'should be checked');

});

test("changing the value should update the group", function() {
  var oldValue = view.get('value');
  SC.RunLoop.begin();
  view.set('value', 'Green');
  SC.RunLoop.end();

  ok(view.get('value') !== oldValue, 'precond - should have changed value');
  var q = Q$('.sel > span', view.get('layer'));
  equals(q.text(), view.get('value'), 'label should have new value');
});

test("isEnabled should alter group classname and sync with isEnabled property", function() {

  // check initial render state
  ok(view.get('isEnabled'), 'isEnabled should match value');
  ok(!view.$().hasClass('disabled'), 'should NOT have disabled class');

  // update value -- make sure isEnabled changes.
  SC.RunLoop.begin();
  view.set('isEnabled', 0); // make falsy. (but not NO exactly)
  SC.RunLoop.end();

  ok(!view.get('isEnabled'), 'isEnabled should now be NO');
  ok(view.$().hasClass('disabled'), 'should have disabled class');

  // update isEnabled -- make sure it edits the value
  SC.RunLoop.begin();
  view.set('isEnabled', YES);
  SC.RunLoop.end();

  ok(view.get('isEnabled'), 'isEnabled should match value');
  ok(!view.$().hasClass('disabled'), 'should NOT have disabled class');
});

test("clicking on a radio button will change toggle the value", function() {
  equals(view.get('value'), 'Red', 'precond - value should be Red');
  var r = view.$('.sc-radio-button');
  SC.Event.trigger(r[1], 'mousedown');
  SC.Event.trigger(r[1], 'mouseup');
  equals(view.get('value'), 'Green', 'value should have changed');
});

test("pressing mouseDown and then mouseUp anywhere in a radio button should toggle the selection", function() {
  var elem = view.get('layer'),
      r = view.$('.sc-radio-button');

  SC.Event.trigger(r[0], 'mousedown');
  equals(view.get('value'), 'Red', 'value should not change yet');
  ok(r.first().hasClass('active'), 'radio button should be active');

  // simulate mouseUp and browser-native change to control
  SC.Event.trigger(r[0],'mouseup');
  //input.attr('checked', NO);
  // loose focus of the element since it was changed
  SC.Event.trigger(r[1],'mousedown');
  SC.Event.trigger(r[1],'mouseup');

  ok(!r.first().hasClass('active'), 'radio button should no longer be active');
  equals(view.get('value'), 'Green', 'value should be undefined (none checked)');

  elem = null ;
});

test("isEnabled=NO should add disabled attr to input", function() {
  SC.RunLoop.begin();
  view.set('isEnabled', NO);
  SC.RunLoop.end();

  ok(view.$().hasClass('disabled'), 'should have disabled attr');

  ok(view.get('value'), 'precond - value should be true');
  view.mouseDown();
  view.mouseUp();
  ok(view.get('value'), 'value should not change when clicked');
});

test("disabled radio buttons do not become selected on click", function () {
  view = pane.childViews[1];

  var elem = view.get('layer'),
      r = view.$('.sc-radio-button');

  SC.Event.trigger(r[0], 'mousedown');
  ok(!r.first().hasClass('active'), 'radio button should not be active');

  // simulate mouseUp and browser-native change to control
  SC.Event.trigger(r[0],'mouseup');
  ok(!r.first().hasClass('active'), 'radio button should not be active');
  equals(r.first().attr('aria-checked'), 'false', 'radio button should not be checked');
  equals(view.get('value'), undefined, "value should be undefined (nothing is checked)");

  // lose focus of the element since it was changed
  SC.Event.trigger(r[1],'mousedown');
  SC.Event.trigger(r[1],'mouseup');

  equals(view.get('value'), undefined, "value should be undefined (nothing is checked)");

  // last one is selectable
  SC.Event.trigger(r[2],'mousedown');
  SC.Event.trigger(r[2],'mouseup');

  equals(view.get('value'), view.items[2], "value should be 'Salgar'");

  elem = null ;
});
