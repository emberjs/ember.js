// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('system/run_loop/schedule_test');

test('scheduling item in queue should defer until finished', function() {
  var cnt = 0;
  
  SC.run(function() {
    SC.run.schedule('actions', function() { cnt++; });
    SC.run.schedule('actions', function() { cnt++; });
    equals(cnt, 0, 'should not run action yet') ;
  });
  
  equals(cnt, 2, 'should flush actions now');
  
});

test('nested runs should queue each phase independently', function() {
  var cnt = 0;
  
  SC.run(function() {
    SC.run.schedule('actions', function() { cnt++; });
    equals(cnt, 0, 'should not run action yet') ;
    
    SC.run(function() {
      SC.run.schedule('actions', function() { cnt++; });
    });
    equals(cnt, 1, 'should not run action yet') ;

  });
  
  equals(cnt, 2, 'should flush actions now');
  
});
