// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module, test, clearHtmlbody, htmlbody, ok, equals, same, stop, start */


function evaluatePicker(pane) {
  ok(pane.get('isVisibleInWindow'), 'pane.isVisibleInWindow should be YES');
  ok(pane.$().hasClass('sc-picker'), 'pane should have sc-picker class');
  ok(pane.childViews[0].get('isVisibleInWindow'), 'pane.div.isVisibleInWindow should be YES');
  ok(pane.childViews[0].$().hasClass('sc-view'), 'pane.div should have sc-view class');

  equals(pane.$('.sc-view').length, 1, 'pane should have only one content view');

  var ret = pane.layoutStyle();

  equals(ret.width, '300px', 'pane should have width 300px');
  equals(ret.height, '200px', 'pane should have height 200px');
}

var anchor = SC.ControlTestPane.design()
  .add("anchor", SC.ButtonView, {
    title: "Anchor Button"
  });

module("SC.PickerPane UI", {
  setup: function () {
    htmlbody('<style> .sc-static-layout { border: 1px red dotted; } </style>');
    anchor.standardSetup().setup();
  },
  teardown: function () {
    anchor.standardSetup().teardown();
    clearHtmlbody();
  }
});


var paneDefault;
var paneMenu;
var paneFixed;
var panePointer;

test("verify default picker pane content container is visible at correct location with right size", function () {
  paneDefault = SC.PickerPane.create({
    layout: { width: 300, height: 200 },
    contentView: SC.View.extend({
      layout: { top: 0, left: 0, bottom: 0, right: 0 }
    })
  });
  SC.run(function () {
    paneDefault.popup(anchor.view('anchor'), SC.PICKER);
  });
  evaluatePicker(paneDefault);
  paneDefault.remove();
  paneDefault.destroy();
});

test("verify default picker pane content container is visible at correct location with right size (live resize)", function () {
  var lowAnchor = SC.Pane.create({
    layout: { bottom: 0, height: 10, centerX: 0, width: 10 }
  });

  paneDefault = SC.PickerPane.create({
    layout: { width: 300, height: 200 },
    contentView: SC.View.extend({
      layout: { top: 0, left: 0, bottom: 0, right: 0 }
    })
  });
  SC.run(function () {
    lowAnchor.append();
    paneDefault.popup(lowAnchor.get('layer'), SC.PICKER);
  });
  evaluatePicker(paneDefault);

  var firstLayout = paneDefault.get('layout');
  SC.run(function () {
    paneDefault.adjust('height', 300);
  });
  var newLayout = paneDefault.get('layout');
  equals(newLayout.height, 300, "The new height should be");
  equals(newLayout.top, firstLayout.top - 100, "The new top should be");

  paneDefault.remove();
  paneDefault.destroy();
});

test("verify menu picker pane content container is visible at correct location with right size", function () {
  paneMenu = SC.PickerPane.create({
    layout: { width: 300, height: 200 },
    contentView: SC.View.extend({
      layout: { top: 0, left: 0, bottom: 0, right: 0 }
    })
  });
  SC.run(function () {
    paneMenu.popup(anchor.view('anchor'), SC.PICKER_MENU);
  });
  evaluatePicker(paneMenu);
  paneMenu.remove();
  paneMenu.destroy();
});

test("verify fixed picker pane content container is visible at correct location with right size", function () {
  paneFixed = SC.PickerPane.create({
    layout: { width: 300, height: 200 },
    contentView: SC.View.extend({
      layout: { top: 0, left: 0, bottom: 0, right: 0 }
    })
  });

  SC.run(function () {
    paneFixed.popup(anchor.view('anchor'), SC.PICKER_FIXED);
  });
  evaluatePicker(paneFixed);
  paneFixed.remove();
  paneFixed.destroy();
});

test("verify pointer picker pane content container is visible at correct location with right size", function () {
  panePointer = SC.PickerPane.create({
    layout: { width: 300, height: 200 },
    contentView: SC.View.extend({
      layout: { top: 0, left: 0, bottom: 0, right: 0 }
    })
  });
  SC.run(function () {
    panePointer.popup(anchor.view('anchor'), SC.PICKER_POINTER, [3, 0, 1, 2, 2]);
  });
  evaluatePicker(panePointer);
  panePointer.remove();
  panePointer.destroy();
});
