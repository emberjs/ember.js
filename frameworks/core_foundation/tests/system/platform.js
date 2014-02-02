// ==========================================================================
// Project: SproutCore - JavaScript Application Framework
// Copyright: ©2012 Michael Krotscheck and contributors. All rights reserved.
// License: Licensed under MIT license (see license.js)
// ==========================================================================

/**
 * Test for correct cordova detection.
 */
test("SC.platform.cordova", function() {
  
  ok(typeof SC.platform.cordova == 'boolean', "Cordova check must have been executed.");
  
  // Is there a chance we're in a cordova runtime?
  var isCordova = typeof window.cordova !== "undefined";
  equals(isCordova, SC.platform.cordova, "Cordova detection must match what we've been able to determine for ourselves");
  
});
