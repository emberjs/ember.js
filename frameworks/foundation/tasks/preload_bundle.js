// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require("tasks/task");

// default callback
SC.didPreloadBundle = function() {};

/**
  @private
  A task that preloads a bundle, supplying a target and action to be called
  on bundle load completion.
*/
SC.PreloadBundleTask = SC.Task.extend({
  /**
    The identifier of the bundle to load.
  */
  bundle: null,
  
  /**
    The target to supply to SC.Module.loadModule.
  */
  target: "SC",
  
  /**
    The action to supply to SC.Module.loadModule.
  */
  action: "preloaded",
  
  run: function(queue) {
    var bundle;
    if (bundle = this.get("bundle")) {
      var st = Date.now();
      SC.Module.loadModule(this.get("bundle"), this.get("target"), this.get("action"));
    }
  }
});
