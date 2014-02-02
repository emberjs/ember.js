// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2010 Sprout Systems, Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test htmlbody ok equals same stop start */


var pane;
(function() {

  pane = SC.ControlTestPane.design()

  .add("aria-role_ToolbarView", SC.ToolbarView, {

  });

  module('SC.ToolbarView UI', pane.standardSetup());

  test("Check that the toolbar view has role set", function(){
    var viewElem = pane.view('aria-role_ToolbarView').$();

    equals(viewElem.attr('role'), 'toolbar', "toolbar view has correct role set");
  });
})();
