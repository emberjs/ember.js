/*global testBoth:true */

// used by unit tests to test both accessor mode and non-accessor mode
testBoth = function(testname, callback) {
  test(testname+' using Ember.get()/Ember.set()', function() {
    callback(Ember.get, Ember.set);
  });

  // test(testname+' using accessors', function() {
  //   if (Ember.USES_ACCESSORS) callback(aget, aset);
  //   else ok('SKIPPING ACCESSORS');
  // });
};
