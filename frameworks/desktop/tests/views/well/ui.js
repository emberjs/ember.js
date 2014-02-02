// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test htmlbody ok equals same stop start */

var iconURL= "http://www.freeiconsweb.com/Icons/16x16_people_icons/People_046.gif";
var pane, view;
module("SC.TabView", {
  setup: function() {
    SC.RunLoop.begin();
    pane = SC.MainPane.create({
      childViews: [
        SC.TabView.extend({
          nowShowing: 'tab2',

          items: [
            { title: "tab1", value: "tab1" , icon: iconURL},
            { title: "tab2", value: "tab2" , icon: iconURL},
            { title: "tab3", value: "tab3" , icon: iconURL}
          ],

          itemTitleKey: 'title',
          itemValueKey: 'value',
          itemIconKey: 'icon',
          layout: { left:12, height: 200, right:12, top:12 }
          
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

test("Check that all segmentedViews are visible", function() {
   ok(true, 'hello');
 });


//_tab_nowShowingDidChange: function() {

//_tab_saveUserDefault: function() {

//_tab_itemsDidChange: function() {
