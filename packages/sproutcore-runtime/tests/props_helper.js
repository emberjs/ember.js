// used by unit tests to test both accessor mode and non-accessor mode
testBoth = function(testname, callback) {
  
  function scget(x,y) { return SC.get(x,y); }
  function scset(x,y,z) { return SC.set(x,y,z); }
  function aget(x,y) { return x[y]; }
  function aset(x,y,z) { return (x[y] = z); }

  test(testname+' using SC.get()/SC.set()', function() {
    callback(scget, scset);
  });
  
  test(testname+' using accessors', function() {
    if (SC.USES_ACCESSORS) callback(aget, aset);
    else ok('SKIPPING ACCESSORS');
  });
};

