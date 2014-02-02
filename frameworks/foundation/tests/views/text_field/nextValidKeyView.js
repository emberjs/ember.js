// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same Q$ htmlbody */

var pane, textfield_view1, textfield_view2, textfield_view3, view1, view2, view3, view4, view5;

var OLD;
    
module("SC.View#nextValidKeyView", {
  setup: function() {
    SC.RunLoop.begin();
    
    pane = SC.Pane.design()
    .layout({ top: 0, left: 0, bottom:0, right: 0 })
    .childView(SC.TextFieldView.design())
    .childView(SC.View.design())
    .childView(SC.View.design()
      .childView(SC.View.design()
        .childView(SC.View.design()
          .childView(SC.View.design()
            .childView(SC.TextFieldView.design())
          )
        )
      )
    )
    .childView(SC.View.design())
    .childView(SC.View.design())
    .childView(SC.View.design())
    .childView(SC.View.design()
      .childView(SC.TextFieldView.design())
    )
    .childView(SC.View.design())
    .create();
    pane.append();
    SC.RunLoop.end();
    
    textfield_view1 = pane.childViews[0];
    textfield_view2 = pane.childViews[2].childViews[0].childViews[0].childViews[0].childViews[0];
    textfield_view3 = pane.childViews[6].childViews[0];
    view1 = pane.childViews[1];
    view2 = pane.childViews[3]; 
    view3 = pane.childViews[4];
    view4 = pane.childViews[5];
    view5 = pane.childViews[7];
    
    OLD = {
      FOCUS_ALL_CONTROLS: SC.FOCUS_ALL_CONTROLS,
      TABBING_ONLY_INSIDE_DOCUMENT: SC.TABBING_ONLY_INSIDE_DOCUMENT
    };

    SC.FOCUS_ALL_CONTROLS = SC.FOCUS_ALL_CONTROLS;
    SC.TABBING_ONLY_INSIDE_DOCUMENT = NO;
    
  },
  

  teardown: function() { 
    
    // restore old settings
    SC.FOCUS_ALL_CONTROLS = OLD.FOCUS_ALL_CONTROLS;
    SC.TABBING_ONLY_INSIDE_DOCUMENT = OLD.TABBING_ONLY_INSIDE_DOCUMENT;

    SC.RunLoop.begin();
    pane.remove();
    pane = textfield_view1 = textfield_view2 = textfield_view3 = view1 = view2 = view3 = null;
    SC.RunLoop.end();
  }
});

test("Navigate between textfields- going forward", function() {
  SC.FOCUS_ALL_CONTROLS = YES;
  SC.TABBING_ONLY_INSIDE_DOCUMENT = NO;
  
  var v = view2.nextValidKeyView();
  same(v, textfield_view3, "The next view should be " + textfield_view3.toString());
  
  v = textfield_view3.nextValidKeyView();
  same(v, null, "The next view should be null");
});

test("Navigate between textfields- going backwards", function() {
  SC.FOCUS_ALL_CONTROLS = YES;
  var v = view2.previousValidKeyView();
  same(v, textfield_view2, "The previous key view should be " + textfield_view2.toString());

});


test("Navigate forward with view that have a nextKeyView set", function() {
  SC.FOCUS_ALL_CONTROLS = YES;
  var v = view2.nextValidKeyView();
  same(v, textfield_view3, "The next view should be " + textfield_view3.toString());
  view3.set('nextKeyView', textfield_view1);
  v = view2.nextValidKeyView();
  same(v, textfield_view1, "The next view should be " + textfield_view1.toString());
});


test("Navigate backwards with view that have a previousKeyView set", function() {
  SC.FOCUS_ALL_CONTROLS = YES;
  var v = view2.previousValidKeyView();
  same(v, textfield_view2, "The next view should be " + textfield_view2.toString());
  view4.set('previousKeyView', textfield_view1);
  v = textfield_view3.previousValidKeyView();
  same(v, textfield_view1, "The next view should be " + textfield_view1.toString());
});
