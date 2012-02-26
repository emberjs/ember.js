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

testWithDefault = function(testname, callback) {
  function get(x,y) { return x.get(y); }
  function emberget(x,y) { return Ember.get(x,y); }
  function embergetwithdefault(x,y,z) { return Ember.getWithDefault(x,y,z); }
  function getwithdefault(x,y,z) { return x.getWithDefault(y,z); }
  function emberset(x,y,z) { return Ember.set(x,y,z); }
  function aget(x,y) { return x[y]; }
  function aset(x,y,z) { return (x[y] = z); }

  test(testname+' using obj.get()', function() {
    callback(emberget, emberset);
  });

  test(testname+' using obj.getWithDefault()', function() {
    callback(getwithdefault, emberset);
  });

  test(testname+' using Ember.get()', function() {
    callback(emberget, emberset);
  });

  test(testname+' using Ember.getWithDefault()', function() {
    callback(embergetwithdefault, emberset);
  });

  test(testname+' using accessors', function() {
    if (Ember.USES_ACCESSORS) callback(aget, aset);
    else ok('SKIPPING ACCESSORS');
  });
};
