// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2010 Sprout Systems, Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test htmlbody ok equals same stop start */

var pane, view;
module("SC.ToolbarView", {
  setup: function() {
    SC.RunLoop.begin();
    pane = SC.MainPane.create({
      childViews: [
        SC.ToolbarView.extend({
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


