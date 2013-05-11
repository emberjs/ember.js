module('system/run_loop/sync_test');

test('sync() will immediately flush the sync queue only', function() {
  var cnt = 0;

  Ember.run(function() {

    function cntup() { cnt++; }

    function syncfunc() {
      if (++cnt<5) Ember.run.schedule('sync', syncfunc);
      Ember.run.schedule('actions', cntup);
    }

    syncfunc();

    equal(cnt, 1, 'should not run action yet') ;
    Ember.run.sync();

    equal(cnt, 5, 'should have run sync queue continuously');
  });

  equal(cnt, 10, 'should flush actions now too');

});
