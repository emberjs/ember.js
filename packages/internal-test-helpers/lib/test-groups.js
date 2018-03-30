import { ENV } from 'ember-environment';
import {
  get as getFromEmberMetal,
  getWithDefault as getWithDefaultFromEmberMetal,
  set as setFromEmberMetal
} from 'ember-metal';

// used by unit tests to test both accessor mode and non-accessor mode
export function testBoth(testname, callback) {
  function emberget(x, y) {
    return getFromEmberMetal(x, y);
  }
  function emberset(x, y, z) {
    return setFromEmberMetal(x, y, z);
  }
  function aget(x, y) {
    return x[y];
  }
  function aset(x, y, z) {
    return (x[y] = z);
  }

  QUnit.test(`${testname} using getFromEmberMetal()/set()`, function(assert) {
    callback(emberget, emberset, assert);
  });

  QUnit.test(`${testname} using accessors`, function(assert) {
    if (ENV.USES_ACCESSORS) {
      callback(aget, aset, assert);
    } else {
      assert.ok('SKIPPING ACCESSORS');
    }
  });
}

export function testWithDefault(testname, callback) {
  function emberget(x, y) {
    return getFromEmberMetal(x, y);
  }
  function embergetwithdefault(x, y, z) {
    return getWithDefaultFromEmberMetal(x, y, z);
  }
  function getwithdefault(x, y, z) {
    return x.getWithDefault(y, z);
  }
  function emberset(x, y, z) {
    return setFromEmberMetal(x, y, z);
  }
  function aget(x, y) {
    return x[y];
  }
  function aset(x, y, z) {
    return (x[y] = z);
  }

  QUnit.test(`${testname} using obj.get()`, function(assert) {
    callback(emberget, emberset, assert);
  });

  QUnit.test(`${testname} using obj.getWithDefault()`, function(assert) {
    callback(getwithdefault, emberset, assert);
  });

  QUnit.test(`${testname} using getFromEmberMetal()`, function(assert) {
    callback(emberget, emberset, assert);
  });

  QUnit.test(`${testname} using getWithDefault()`, function(assert) {
    callback(embergetwithdefault, emberset, assert);
  });

  QUnit.test(`${testname} using accessors`, function(assert) {
    if (ENV.USES_ACCESSORS) {
      callback(aget, aset, assert);
    } else {
      assert.ok('SKIPPING ACCESSORS');
    }
  });
}
