// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test htmlbody ok equals same stop start */

module('SC.Pane-SC.Page') ;

test("isVisible changes should update views that are instantiated in a page", function() {
  var page = SC.Page.design({

    inspector: SC.PickerPane.design({
      layout: { width: 300, height: 300, centerX: 0 },
      contentView: SC.View.extend({
        layout: { top: 0, left: 0, bottom: 0, right: 0 },
        childViews: ['labelView'],

        labelView: SC.LabelView.extend({
          layout: { centerY: -10, height: 24, left: 0, right: 0 },
          value: "PrefPane"
        })
      })
    })

  });


  var pp = page.get('inspector');
  pp.append();
  SC.RunLoop.begin().end();
  pp.remove();
  SC.RunLoop.begin().end();
  pp.childViews[0].childViews[0].set('isVisible', NO);
  SC.RunLoop.begin().end();
  pp.append();
  SC.RunLoop.begin().end();
  var res = pp.childViews[0].childViews[0].$().hasClass('sc-hidden');
  ok(res, "The view (isVisible) has been properly rerendered even though it was part of a page, the pane was detached and the visibility was changed while detached");

  pp.remove();

  page.destroy();
});
