// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('system/run_loop/schedule_test');

test('sync() will immediately flush the sync queue only', function() {
  var cnt = 0;
  
  Ember.run(function() {

    function cntup() { cnt++; }
    
    function syncfunc() {
      if (++cnt<5) Ember.run.schedule('sync', syncfunc);
      Ember.run.schedule('actions', cntup);
    }
    
    syncfunc();

    equals(cnt, 1, 'should not run action yet') ;
    Ember.run.sync();
    
    equals(cnt, 5, 'should have run sync queue continuously');
  });
  
  equals(cnt, 10, 'should flush actions now too');
  
});


test('sync() works outside of runloop (by fixing runloop)', function() {
  var cnt = 0;
  
  function cntup() { cnt++; }
  
  function syncfunc() {
    if (++cnt<5) Ember.run.schedule('sync', syncfunc);
    Ember.run.schedule('actions', cntup);
  }
    
  syncfunc();

  equals(cnt, 1, 'should not run action yet') ;
  Ember.run.sync();
    
  equals(cnt, 5, 'should have run sync queue continuously');
  
});

