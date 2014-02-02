// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ========================================================================
// SC.Timer.isPaused Tests
// ========================================================================
/*globals module test ok isObj equals expects */

module("Timer.isPaused") ;

test("setting isPaused should stop firing", function() {
  
  var firedCount = 0, f1, f2, f3 ;
  
  SC.RunLoop.begin() ;
  var start = SC.RunLoop.currentRunLoop.get('startTime') ;
  var t = SC.Timer.schedule({
    target: this,
    action: function() { firedCount++ ; },
    interval: 100,
    repeats: YES
  });
  SC.RunLoop.end() ;
  
  // wait for timer to fire twice, then pause it.
  var tries1 = 10 ;
  f1 = function f1() {
    if(firedCount<2) {
      if (--tries1 >= 0) {
        setTimeout(f1, 100) ;
      } else {
        equals(NO, YES, 'Timer never fired 2 times - f1') ;
        window.start() ; // starts the test runner
      }
    } else {
      equals(NO, t.get('isPaused'), 'should start with isPaused = NO');
      t.set('isPaused', YES) ;
      firedCount = 0 ; // Reset count here.
      setTimeout(f2, 300) ;
    }
  };
  
  // once timer paused, make sure it did not fire again.
  f2 = function f2() {
    equals(0, firedCount, 'timer kept firing!') ;
    equals(YES, t.get('isPaused'), 'timer is not paused') ;
    t.set('isPaused', NO) ;
    setTimeout(f3, 300) ;
  } ;
  
  // once timer has verified paused, unpause and make sure it fires again.
  var tries2 = 10 ;
  f3 = function f3() {
    if (firedCount <= 2) {
      if (--tries2 >= 0) {
        setTimeout(f3, 100) ;
      } else {
        equals(NO, YES, "Timer did not resume") ;
        window.start() ; // starts the test runner
      }
      
    // timer fired, clean up.
    } else {
      t.invalidate() ;
      equals(NO, t.get('isPaused'), 'timer did not unpause') ;
      window.start() ; // starts the test runner
    }
  };
  
  stop() ; // stops the test runner
  setTimeout(f1, 300) ;
});

// using invalidate on a repeating timer is tested in schedule().
