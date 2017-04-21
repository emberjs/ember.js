import { ENV } from 'ember-environment';
import {
  get as getFromEmberMetal,
  getWithDefault as getWithDefaultFromEmberMetal,
  set as setFromEmberMetal
} from 'ember-metal';

// used by unit tests to test both accessor mode and non-accessor mode
export function testBoth(testname, callback) {
  function emberget(x, y) { return getFromEmberMetal(x, y); }
  function emberset(x, y, z) { return setFromEmberMetal(x, y, z); }
  function aget(x, y) { return x[y]; }
  function aset(x, y, z) { return (x[y] = z); }

  QUnit.test(testname + ' using getFromEmberMetal()/Ember.set()', function() {
    callback(emberget, emberset);
  });

  QUnit.test(testname + ' using accessors', function() {
    if (ENV.USES_ACCESSORS) {
      callback(aget, aset);
    } else {
      ok('SKIPPING ACCESSORS');
    }
  });
}

export function testWithDefault(testname, callback) {
  function emberget(x, y) { return getFromEmberMetal(x, y); }
  function embergetwithdefault(x, y, z) { return getWithDefaultFromEmberMetal(x, y, z); }
  function getwithdefault(x, y, z) { return x.getWithDefault(y, z); }
  function emberset(x, y, z) { return setFromEmberMetal(x, y, z); }
  function aget(x, y) { return x[y]; }
  function aset(x, y, z) { return (x[y] = z); }

  QUnit.test(testname + ' using obj.get()', function() {
    callback(emberget, emberset);
  });

  QUnit.test(testname + ' using obj.getWithDefault()', function() {
    callback(getwithdefault, emberset);
  });

  QUnit.test(testname + ' using getFromEmberMetal()', function() {
    callback(emberget, emberset);
  });

  QUnit.test(testname + ' using Ember.getWithDefault()', function() {
    callback(embergetwithdefault, emberset);
  });

  QUnit.test(testname + ' using accessors', function() {
    if (ENV.USES_ACCESSORS) {
      callback(aget, aset);
    } else {
      ok('SKIPPING ACCESSORS');
    }
  });
}
