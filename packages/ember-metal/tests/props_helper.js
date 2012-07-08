// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
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
