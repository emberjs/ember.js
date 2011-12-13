// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global testBoth */

// used by unit tests to test both accessor mode and non-accessor mode
testBoth = function(testname, callback) {
  
  function emberget(x,y) { return Ember.get(x,y); }
  function emberset(x,y,z) { return Ember.set(x,y,z); }
  function aget(x,y) { return x[y]; }
  function aset(x,y,z) { return (x[y] = z); }

  test(testname+' using Ember.get()/Ember.set()', function() {
    callback(emberget, emberset);
  });
  
  test(testname+' using accessors', function() {
    if (Ember.USES_ACCESSORS) callback(aget, aset);
    else ok('SKIPPING ACCESSORS');
  });
};