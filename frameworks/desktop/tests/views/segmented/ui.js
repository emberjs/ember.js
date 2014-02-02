// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module, test, htmlbody, ok, equals, clearHtmlbody, $ */


var pane;
(function () {
  var iconURL = sc_static("sproutcore-32.png");

  pane = SC.ControlTestPane.design()

    .add("3_empty", SC.SegmentedView, {
      items: ['', '', ''],
      layout: { height: 25 }
    })
    .add("3_empty,icon", SC.SegmentedView, {
      items: [
        { value: "", icon: iconURL },
        { value: "", icon: iconURL },
        { value: "", icon: iconURL }
      ],
      itemTitleKey: 'value',
      itemValueKey: 'value',
      itemIconKey: 'icon',
      layout: { height: 25 }
    })
    .add("3_items,1_sel", SC.SegmentedView, {
      items: "Item1 Item2 Item3".w(),
      value: "Item2",
      layout: { height: 25 }
    })
    .add("2_items,toolTip", SC.SegmentedView, {
      items: [
        { value: "title1", toolTip: "this is title1's tip" },
        { value: "title2", toolTip: "this is title2's tip" }
      ],
      itemTitleKey: 'value',
      itemValueKey: 'value',
      itemToolTipKey: 'toolTip',
      layout: { height: 25 }
    })
    .add("3_items,1_sel,disabled", SC.SegmentedView, {
      items: "Item1 Item2 Item3".w(),
      value: "Item2",
      isEnabled: NO,
      layout: { height: 25 }
    })
    .add("3_items,2_sel,1_disabled", SC.SegmentedView, {
      items: [
        { value: "Item1" },
        { value: "Item2", isEnabled: false },
        { value: "Item3" }
      ],
      itemTitleKey: 'value',
      itemValueKey: 'value',
      itemIsEnabledKey: 'isEnabled',
      value: ["Item1", "Item2"],
      layout: { height: 25 }
    })
    .add("3_items,icon,2_sel", SC.SegmentedView, {
      items: [
        { value: "Item1", icon: iconURL },
        { value: "Item2", icon: iconURL },
        { value: "Item3", icon: iconURL }
      ],
      itemTitleKey: 'value',
      itemValueKey: 'value',
      itemIconKey: 'icon',
      value: "Item1 Item3".w(),
      allowsEmptySelection: NO,
      layout: { height: 25 }
    })
    .add("3_items,2_sel,disabled", SC.SegmentedView, {
      items: [
        { value: "Item1", icon: iconURL },
        { value: "Item2", icon: iconURL },
        { value: "Item3", icon: iconURL }
      ],
      itemTitleKey: 'value',
      itemValueKey: 'value',
      itemIconKey: 'icon',
      isEnabled: NO,
      value: "Item1 Item3".w(),
      layout: { height: 25 }
    })
    .add("3_items,1_sel,emptySel", SC.SegmentedView, {
      items: ["Item1", "Very Long Item", "Item 3"],
      value: "Very Long Item",
      allowsEmptySelection: YES,
      layout: { height: 25 }
    })
    .add("3_items,2_sel,emptySel", SC.SegmentedView, {
      items: ["Item1", "Very Long Item", "Item 3"],
      value: "Item1 Item3".w(),
      allowsEmptySelection: YES,
      layout: { height: 25 }
    })
    .add("3_items,1_sel,multipleSel", SC.SegmentedView, {
      items: "Item1 Item2 Item3".w(),
      value: "Item2",
      allowsMultipleSelection: YES,
      layout: { height: 25 }
    })
    .add("3_items,2_sel,multipleSel", SC.SegmentedView, {
      items: "Item1 Item2 Item3".w(),
      value: "Item1 Item3".w(),
      allowsMultipleSelection: YES,
      layout: { height: 25 }
    })
    .add("3_items,1_sel,emptySel,multiSel", SC.SegmentedView, {
      items: "Item1 Item2 Item3".w(),
      value: "Item2",
      allowsEmptySelection: YES,
      allowsMultipleSelection: YES,
      layout: { height: 25 }
    })
    .add("3_items,2_sel,emptySel,multiSel", SC.SegmentedView, {
      items: "Item1 Item2 Item3".w(),
      value: "Item1 Item3".w(),
      allowsEmptySelection: YES,
      allowsMultipleSelection: YES,
      layout: { height: 25 }
    })
    .add("3_items,leftAligned", SC.SegmentedView, {
      items: "Item1 Item2 Item3".w(),
      align: SC.ALIGN_LEFT,
      layout: { height: 25 }
    })
    .add("3_items,rightAligned", SC.SegmentedView, {
      items: "Item1 Item2 Item3".w(),
      align: SC.ALIGN_RIGHT,
      layout: { height: 25 }
    })
    .add("3_items,widths", SC.SegmentedView, {
      items: [
        SC.Object.create({ value: "A", width: 70 }),
        SC.Object.create({ value: "B", width: 70 }),
        SC.Object.create({ value: "C", width: 70 })
      ],
      itemTitleKey: 'value',
      itemValueKey: 'value',
      itemWidthKey: 'width',
      layout: { height: 25 }
    })
    .add("5_items,widths,overflow", SC.SegmentedView, {
      items: [
        { value: "A", width: 70 },
        { value: "B", width: 70 },
        { value: "C", width: 70 },
        { value: "D", width: 70 },
        { value: "E", width: 70 }
      ],
      itemTitleKey: 'value',
      itemValueKey: 'value',
      itemWidthKey: 'width',
      layout: { height: 25 }
    })
    .add("5_items,1_sel,widths,overflow", SC.SegmentedView, {
      items: [
        { value: "A", width: 70 },
        { value: "B", width: 70 },
        { value: "C", width: 70 },
        { value: "D", width: 70 },
        { value: "E", width: 70 }
      ],
      itemTitleKey: 'value',
      itemValueKey: 'value',
      itemWidthKey: 'width',
      value: "E",
      layout: { height: 25 }
    })
    .add("aria-role_tab,tablist", SC.SegmentedView, {
      items: [
        { title: "Item 1" },
        { title: "Item 2" },
        { title: "Item 3" }
      ],
      itemTitleKey: "title",
      layout: { height: 25 }
    })
    .add("aria-labelledby", SC.SegmentedView, {
      items: [
        { title: "Item 1" },
        { title: "Item 2" },
        { title: "Item 3" }
      ],
      itemTitleKey: "title",
      layout: { height: 25 }
    });

  // ..........................................................
  // TEST VIEWS
  //
  module('SC.SegmentedView ui', {
    setup: function () {
      htmlbody('<style> .sc-static-layout { border: 1px red dotted; } </style>');
      pane.standardSetup().setup();
    },
    teardown: function () {
      pane.standardSetup().teardown();
      clearHtmlbody();
    }
  });

  test("Check that all segmentedViews are visible", function () {
    ok(pane.view('3_empty').get('isVisibleInWindow'), '3_empty.isVisibleInWindow should be YES');
    ok(pane.view('3_empty,icon').get('isVisibleInWindow'), '3_empty,icon.isVisibleInWindow should be YES');
    ok(pane.view('3_items,1_sel').get('isVisibleInWindow'), '3_items,1_sel.isVisibleInWindow should be YES');
    ok(pane.view('2_items,toolTip').get('isVisibleInWindow'), '2_items,toolTip.isVisibleInWindow should be YES');
    ok(pane.view('3_items,1_sel,disabled').get('isVisibleInWindow'), '3_items,1_sel,disabled.isVisibleInWindow should be YES');
    ok(pane.view('3_items,2_sel,disabled').get('isVisibleInWindow'), '3_items,2_sel,disabled.isVisibleInWindow should be YES');
    ok(pane.view('3_items,2_sel,1_disabled').get('isVisibleInWindow'), '3_items,2_sel,1_disabled.isVisibleInWindow should be YES');
    ok(pane.view('3_items,icon,2_sel').get('isVisibleInWindow'), '3_items,icon,2_sel.isVisibleInWindow should be YES');
    ok(pane.view('3_items,1_sel,emptySel').get('isVisibleInWindow'), '3_items,1 sel,emptySel.isVisibleInWindow should be YES');
    ok(pane.view('3_items,2_sel,emptySel').get('isVisibleInWindow'), '3_items,2 sel,emptySel.isVisibleInWindow should be YES');
    ok(pane.view('3_items,1_sel,multipleSel').get('isVisibleInWindow'), '3_items,1_sel,multipleSel.isVisibleInWindow should be YES');
    ok(pane.view('3_items,2_sel,multipleSel').get('isVisibleInWindow'), '3_items,2_sel,multipleSel.isVisibleInWindow should be YES');
    ok(pane.view('3_items,1_sel,emptySel,multiSel').get('isVisibleInWindow'), '3_items,1_sel,emptySel,multiSel.isVisibleInWindow should be YES');
    ok(pane.view('3_items,2_sel,emptySel,multiSel').get('isVisibleInWindow'), '3_items,2_sel,emptySel,multiSel.isVisibleInWindow should be YES');
    ok(pane.view('3_items,leftAligned').get('isVisibleInWindow'), '3_items,leftAligned.isVisibleInWindow should be YES');
    ok(pane.view('3_items,rightAligned').get('isVisibleInWindow'), '3_items,rightAligned.isVisibleInWindow should be YES');
    ok(pane.view('aria-role_tab,tablist').get('isVisibleInWindow'), 'aria-role_tab,tablist.isVisibleInWindow should be YES');
    ok(pane.view('aria-labelledby').get('isVisibleInWindow'), 'aria-labelledby.isVisibleInWindow should be YES');
  });


  test("Check that all segments have the right classes set", function () {
    var viewElem = pane.view('3_empty').$();
    var segments = pane.view('3_empty').$('.sc-segment-view'),
      seg;

    equals(segments.length, 4, 'precond - segmented view should have 4 segment elements (including overflow)');

    ok(viewElem.hasClass('sc-view'), '3_empty.hasClass(sc-view) should be YES');
    ok(viewElem.hasClass('sc-segmented-view'), '3_empty.hasClass(sc-segmented-view) should be YES');
    for (var i = 0, seglen = segments.length - 1; i < seglen; i++) {
      seg = segments[i];
      if (i === 0) {
        ok((seg.className.indexOf('sc-first-segment') >= 0), 'first segment has the right classname assigned.');
      }
      if (i === seglen - 1) {
        ok((seg.className.indexOf('sc-last-segment') >= 0), 'last segment has the right classname assigned.');
      }

      ok((seg.childNodes[3].className.indexOf('sc-button-label') >= 0), 'segment ' + i + ' should have a label.');

      if (i !== 0 && i < seglen - 1) {
        ok((seg.className.indexOf('sc-middle-segment') >= 0), 'middle segments have the right classname assigned.');
      }
    }

    viewElem = pane.view('3_items,1_sel,disabled').$();
    ok(viewElem.hasClass('disabled'), '3_items,1_sel,disabled should have the disabled class set');

    viewElem = pane.view('3_items,2_sel,disabled').$();
    ok(viewElem.hasClass('disabled'), '3_items,2_sel,disabled should have the disabled class set');

    seg = pane.view('3_items,2_sel,1_disabled').$('.sc-segment-view')[1];
    ok($(seg).hasClass('disabled'), '3_items,2_sel,1_disabled should have the disabled class set on the middle segment');
  });


  test("Check that all segments have the right classes set (with icons)", function () {
    var viewElem = pane.view('3_empty,icon').$();
    var segments = pane.view('3_empty,icon').$('.sc-segment-view');

    equals(segments.length, 4, 'precond - segmented view should have 4 segment elements (including overflow)');

    ok(viewElem.hasClass('sc-view'), '3_empty.hasClass(sc-view) should be YES');
    ok(viewElem.hasClass('sc-segmented-view'), '3_empty.hasClass(sc-segmented-view) should be YES');
    for (var i = 0, seglen = segments.length - 1; i < seglen; i++) {
      var seg = segments[i];
      if (i === 0) {
        ok((seg.className.indexOf('sc-first-segment') >= 0), 'first segment has the right classname assigned.');
      }
      if (i == seglen - 1) {
        ok((seg.className.indexOf('sc-last-segment') >= 0), 'last segment has the right classname assigned.');
      }
      ok((seg.childNodes[3].className.indexOf('sc-button-label') >= 0), 'segment ' + i + ' should have a label.');
      ok((seg.childNodes[3].childNodes[0].src.length > 0), 'segment ' + i + ' should have an icon.');

      if (i !== 0 && i != seglen - 1) {
        ok((seg.className.indexOf('sc-middle-segment') >= 0), 'middle segments have the right classname assigned.');
      }
    }

    viewElem = pane.view('3_items,2_sel,disabled').$();
    ok(viewElem.hasClass('disabled'), '3_items,2_sel,disabled should have the disabled class set');
  });

  test("No value set", function () {
    var segments = pane.view('3_empty').$('.sc-segment-view');

    equals(segments.length, 4, 'precond - segmented view should have 4 segment elements (including overflow)');
    for (var i = 0, ilen = segments.length; i < ilen; i++) {
      var seg = segments[i];
      ok((seg.className.indexOf('sel') == -1), 'this element should not be selected.');
    }

  });

  test("Check that two items are selected.", function () {
    var segments = pane.view('3_items,icon,2_sel').$('.sc-segment-view');
    var count = 0;

    equals(segments.length, 4, 'precond - segmented view should have 4 segment elements (including overflow)');

    for (var i = 0, ilen = segments.length; i < ilen; i++) {
      var seg = segments[i];
      if (seg.className.indexOf('sel') != -1) {
        count++;
      }
    }
    equals(count, 2, '3_items,2_sel,disabled should have two segments selected.');

  });

  test("2_items,toolTip has toolTips assigned.", function () {
    var segments = pane.view('2_items,toolTip').$('.sc-segment-view');
    ok((segments[0].title == "this is title1's tip"), 'first segment has expected tool tip assigned.');
    ok((segments[1].title == "this is title2's tip"), 'second segment has expected tool tip assigned.');
  });

  test("Check the alignment styles for align property.", function () {
    equals(pane.view("3_empty").$().css('text-align'), 'center', 'default align property should text-align the segmented-view to the center');
    equals(pane.view("3_items,leftAligned").$().css('text-align'), 'left', 'setting align: SC.ALIGN_LEFT should text-align the segmented-view to the left');
    equals(pane.view("3_items,rightAligned").$().css('text-align'), 'right', 'setting align: SC.ALIGN_LEFT should text-align the segmented-view to the left');
  });

  test("Check that changing title re-renders the segments (for SC.Object items only).", function () {
    var sv = pane.view("3_items,widths");
    var segments = sv.$('.sc-segment-view');
    var defaults = ['A', 'B', 'C'],
      segEl,
      label;

    for (var i = 0, len = segments.length - 1; i < len; i++) {
      segEl = segments[i];
      label = $(segEl).find('label')[0];
      equals(label.innerHTML, defaults[i], 'there should be "' + defaults[i] + '" in the segment\'s label');
    }

    // change the title of the second item
    var items = sv.get('items');
    SC.run(function () {
      items[1].set('value', 'Item 2');
    });

    segEl = segments[1];
    label = $(segEl).find('label')[0];
    equals(label.innerHTML, "Item 2", 'there should be "Item 2" text in the second segment');
  });

  test("Check that changing width re-renders the segments (for hash or object items only).", function () {
    var sv = pane.view("3_items,widths");
    var segments = sv.$('.sc-segment-view'),
      segEl, width;

    for (var i = 0, len = segments.length - 1; i < len; i++) {
      segEl = segments[i];
      width = $(segEl).css('width');
      equals(width, "70px", 'the segment style width should be "70px"');
    }

    // change the width of the second item
    var items = sv.get('items');
    SC.run(function () {
      items[1].set('width', 100);
    });

    segEl = segments[1];
    width = $(segEl).css('width');
    equals(width, "100px", 'the second segment style width should be "100px"');
  });

  test("Check that overflow adds an overflow segment on view.", function () {
    var sv = pane.view("5_items,widths,overflow");
    var lastIsOverflow = function (sv) {
      var segments = sv.$('.sc-segment-view');
      var overflowEl = segments[segments.length - 1];
      ok($(overflowEl).hasClass('sc-overflow-segment'), 'overflow segment should have .sc-overflow-segment class');
      var overflowLabelEl = $(overflowEl).find('label')[0];
      equals(overflowLabelEl.innerHTML, "»", 'there should be "»" text in the overflow segment');
    };

    var lastIsSegment = function (sv, text) {
      var segments = sv.$('.sc-segment-view');
      var lastEl = segments[segments.length - 2];
      ok(!$(lastEl).hasClass('sc-overflow-segment'), 'last segment should not have .sc-overflow-segment class');
      var lastLabelEl = $(lastEl).find('label')[0];
      equals(lastLabelEl.innerHTML, text, 'there should be "' + text + '" text in the last segment');
    };

    // the last item should be an overflow segment (ie. has .sc-overflow-segment class and text "&raquo")
    lastIsOverflow(sv);

    // check that the overflowed items are stored
    var overflowItems = sv.overflowItems;

    // five items, 70px wide, and a 342px wide container means 1 overflow.
    equals(overflowItems.length, 1, "there should be 2 overflowed items");

    // 1. remove the last two items (the last item should no longer be an overflow segment)
    var items = sv.get('items');
    SC.run(function () {
      items.removeAt(items.length - 1);
      items.removeAt(items.length - 1);
    });
    lastIsSegment(sv, "C");

    // 2. add an item (the last item should be an overflow segment again)
    SC.run(function () {
      items.pushObject({value: 'X', width: 100});
    });
    lastIsOverflow(sv);

    // 3. shrink the items (the last item should no longer be an overflow segment)
    SC.run(function () {
      items.invoke('set', 'width', 50);
    });
    lastIsSegment(sv, "X");

    // 4. grow the items (the last item should be an overflow segment again)
    SC.run(function () {
      items.invoke('set', 'width', 100);
    });
    lastIsOverflow(sv);

    // 5. shrink the items, but then shrink the segmented view
    SC.run(function () {
      items.invoke('set', 'width', 50);
    });
    lastIsSegment(sv, "X");

    SC.run(function () {
      sv.set('layout', {left: 75, right: 75, top: 0, height: 25});
    });
    lastIsOverflow(sv);
  });

  test("Check that the overflow segment is selected when overflowed items are selected.", function () {
    var sv = pane.view("5_items,1_sel,widths,overflow");
    var segments = sv.$('.sc-segment-view');

    // the overflow item should be selected (because an overflowed item is selected)
    var overflowEl = segments[segments.length - 1];
    ok($(overflowEl).hasClass('sel'), 'overflow segment should have .sel class');
  });

  test("Check that the segmented view and segments have aria roles set", function () {
    var sv = pane.view("aria-role_tab,tablist"),
        viewElem  = sv.$(),
        segments, i, len, segmentViewElem, role;

    equals(viewElem.attr('role'), 'group', "The segmented view has aria role set");

    segments = sv.get('childViews');
    for (i = 0, len = segments.length; i < len; ++i) {
      segmentViewElem = segments[i].$();
      role = segmentViewElem.attr('role');
      equals(role, "button", "segment " + (i + 1) + " have aria role set");
    }
  });

  test("Check that the segments have aria-labelled attribute set", function () {
    var sv = pane.view('aria-labelledby'),
        segments = sv.get('childViews'),
        i, len, segmentViewElem, aria_labelledby, label;

    for (i = 0, len = segments.length; i < len; ++i) {
      segmentViewElem = segments[i].$();
      label = segments[i].$('label.sc-button-label')[0];
      aria_labelledby = document.getElementById(segmentViewElem.attr('aria-labelledby'));
      equals(aria_labelledby, label, "segment " + (i + 1) + " has aria-labeledby pointing at button label");
    }
  });

  test("Check that mouse events change the active classes.", function () {
    var view1, view2, view3, layer1, layer2, layer3, point, ev;

    view1 = pane.view('3_items,2_sel,1_disabled').get('childViews').objectAt(0); // $('.sc-segment-view')[0];
    layer1 = view1.get('layer');
    point = SC.offset(layer1);

    ev = SC.Event.simulateEvent(layer1, 'mousedown', { clientX: point.x, clientY: point.y });
    SC.Event.trigger(layer1, 'mousedown', [ev]);

    ok(view1.$().hasClass('active'), 'The first segment should have an active class on mousedown');

    ev = SC.Event.simulateEvent(layer1, 'mousemove', { clientX: point.x + 1, clientY: point.y });
    SC.Event.trigger(layer1, 'mousemove', [ev]);

    view2 = pane.view('3_items,2_sel,1_disabled').get('childViews').objectAt(1);
    layer2 = view2.get('layer');
    point = SC.offset(layer2);

    ev = SC.Event.simulateEvent(layer2, 'mousemove', { clientX: point.x + 1, clientY: point.y + 1 });
    SC.Event.trigger(layer2, 'mousemove', [ev]);

    ok(!view1.$().hasClass('active'), 'The first segment should no longer have an active class on mouseExited (via mousemove)');
    ok(!view2.$().hasClass('active'), 'The disabled second segment should not have an active class on mouseEntered (via mousemove)');

    view3 = pane.view('3_items,2_sel,1_disabled').get('childViews').objectAt(2);
    layer3 = view3.get('layer');
    point = SC.offset(layer3);

    ev = SC.Event.simulateEvent(layer3, 'mousemove', { clientX: point.x + 1, clientY: point.y + 1 });
    SC.Event.trigger(layer3, 'mousemove', [ev]);

    ok(view3.$().hasClass('active'), 'The third segment should have an active class on mouseMoved');

    ev = SC.Event.simulateEvent(layer3, 'mouseup', { clientX: point.x + 1, clientY: point.y + 1 });
    SC.Event.trigger(layer3, 'mouseup', [ev]);

    ok(!view1.$().hasClass('sel'), 'The first segment should lose its sel class on mouseUp');
    ok(view3.$().hasClass('sel'), 'The third segment should have a sel class on mouseUp');
  });

})();
