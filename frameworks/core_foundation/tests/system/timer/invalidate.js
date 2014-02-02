// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ========================================================================
// SC.Timer Tests
// ========================================================================
/*globals module test ok isObj equals expects */

/**
  Exercises timer invalidation on the SC.Timer class.
*/
module("Timer.invalidate") ;

/**
  A timer scheduled and then invalidated before the end of the run loop should 
  not fire.
  
  @author Erich Ocean
  @since 6e7becdfb4e7f22b340eb5e6d7f3b4df4ea65060
*/
test("invalidate immediately should never execute", function() {
  
  var fired = NO ;
  
  SC.RunLoop.begin() ;
  var start = SC.RunLoop.currentRunLoop.get('startTime') ;
  var t = SC.Timer.schedule({
    target: this,
    action: function() { fired = YES ; },
    interval: 100
  });
  t.invalidate() ;
  SC.RunLoop.end() ;
  
  stop(2500) ; // stops the test runner, fails after 2500ms
  setTimeout(function() {
    equals(NO, fired) ;
    window.start() ; // starts the test runner
  }, 1500);
  
});
