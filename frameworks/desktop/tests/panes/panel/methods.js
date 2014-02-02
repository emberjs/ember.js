// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test htmlbody ok equals same stop start */

module("PanelPane - Methods");

function getViewCount() {
  var i = 0; for (key in SC.View.views) ++i;
  return i;
}

test("PanelPane destroy", function() {
  var start = getViewCount();

  var pane = SC.PanelPane.create({
    isModal: YES
  });
  pane.append();
  pane.remove();
  pane.destroy();

  var end = getViewCount();
  equals(start, end, "No extra views lying about after calling .destroy");
});
