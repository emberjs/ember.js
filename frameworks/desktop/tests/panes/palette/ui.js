// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test htmlbody ok equals same stop start */

module("SC.PalettePane UI");

var pane ;

test("verify palette pane content container is visible at correct location with right size", function() {
  pane = SC.PalettePane.create({
    layout: { width: 400, height: 200, right: 20, top: 0 },
    contentView: SC.View.extend({
    })
  });
  pane.append();

  ok(pane.get('isVisibleInWindow'), 'pane.isVisibleInWindow should be YES');
  ok(pane.$().hasClass('sc-palette'), 'pane should have sc-palette class');
  ok(pane.childViews[0].get('isVisibleInWindow'), 'pane.div.isVisibleInWindow should be YES');
  ok(pane.childViews[0].$().hasClass('sc-view'), 'pane.div should have sc-view class');

  var ret = pane.layoutStyle();

  equals(ret.top, '0px', 'pane should be initiated at default position top including shadow');
  equals(ret.right, '20px', 'pane should be initiated at default position right including shadow');
  equals(ret.width, '400px', 'pane should have width 400px');
  equals(ret.height, '200px', 'pane should have height 200px');

  pane.remove();
  pane.destroy();
}) ;
