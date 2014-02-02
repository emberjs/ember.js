// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test htmlbody ok equals same stop start target */

window.target = null;

var anchor = SC.ControlTestPane.design()
  .add("anchor", SC.ButtonView, {
     title: "Anchor Button"
  });

var pane;

module("SC.PickerPane Methods", {
  setup: function(){
    window.target = SC.Object.create({
      fooInvoked: NO,
      sender: null,
      foo: function(sender) {
        this.set('sender', sender);
        this.set('fooInvoked', YES);
        sender.remove();
      }
    });
    anchor.standardSetup().setup();
  },

  teardown: function(){
    window.target = null;
    anchor.standardSetup().teardown();
  }
});

test("check default action on pane#mouseDown", function() {
  pane = SC.PickerPane.create({
    layout: { width: 300, height: 200 },
    contentView: SC.View.extend({
      layout: { top: 0, left: 0, bottom: 0, right: 0 }
    })
  });
  pane.popup(anchor.view('anchor'), SC.PICKER);

  ok(pane.get('isVisibleInWindow'), 'pane.isVisibleInWindow should be YES');

  pane.mouseDown({ pageX: 0, pageY: 0 });

  ok(!pane.get('isVisibleInWindow'), 'pane.isVisibleInWindow should be NO after mouseDown');

  pane.destroy();
}) ;

test("check action on pane#mouseDown with removeAction set", function() {
  pane = SC.PickerPane.create({

    layout: { width: 300, height: 200 },
    contentView: SC.View.extend({
      layout: { top: 0, left: 0, bottom: 0, right: 0 }
    }),
    removeAction: 'foo',
    fooInvoked: NO,
    foo: function() {
      this.set('fooInvoked', YES);
      this.remove();
    }
  });
  pane.popup(anchor.view('anchor'), SC.PICKER);

  ok(pane.get('isVisibleInWindow'), 'pane.isVisibleInWindow should be YES');

  pane.mouseDown({ pageX: 0, pageY: 0 });

  ok(!pane.get('isVisibleInWindow'), 'pane.isVisibleInWindow should be NO after mouseDown');
  ok(pane.get('fooInvoked'), 'pane.fooInvoked should be YES after mouseDown');

  pane.destroy();
}) ;

test("check action on pane#mouseDown with removeAction and removeTarget set", function() {
  pane = SC.PickerPane.create({

    layout: { width: 300, height: 200 },
    contentView: SC.View.extend({
      layout: { top: 0, left: 0, bottom: 0, right: 0 }
    }),
    removeAction: 'foo',
    removeTarget: target
  });
  pane.popup(anchor.view('anchor'), SC.PICKER);

  ok(pane.get('isVisibleInWindow'), 'pane.isVisibleInWindow should be YES');

  pane.mouseDown({ pageX: 0, pageY: 0 });

  ok(!pane.get('isVisibleInWindow'), 'pane.isVisibleInWindow should be NO after mouseDown');
  ok(target.get('fooInvoked'), 'target.fooInvoked should be YES');
  ok(target.get('sender'), pane, 'target.sender should be pane');

  pane.destroy();
}) ;
