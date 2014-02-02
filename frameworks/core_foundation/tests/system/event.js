// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

// // ========================================================================
// SC.Event Tests
// ========================================================================
(function () {
  module("SC.Event");

  // WebKit browsers have equal values for keyCode and charCode on keypress event
  test("commandCodes() : should handle equal keyCode and charCode on keypress", function () {
    // 115 is also keyCode for F4 button
    var codes = new SC.Event({ type: 'keypress', keyCode: 115, charCode: 115 }).commandCodes();
    equals(codes[0], null, 'command');
    equals(codes[1], 's', 'char');
  });  
})();

