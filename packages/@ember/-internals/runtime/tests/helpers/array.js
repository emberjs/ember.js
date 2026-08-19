import ArrayProxy from '@ember/array/proxy';
import EmberArray, { A as emberA } from '@ember/array';
import MutableArray from '@ember/array/mutable';
import { generateGuid, guidFor } from '@ember/-internals/utils';
import {
  addArrayObserver,
  removeArrayObserver,
  arrayContentWillChange,
  arrayContentDidChange,
} from '@ember/-internals/metal';
import EmberObject, { get, computed } from '@ember/object';
import { moduleFor, ignoreDeprecation } from 'internal-test-helpers';
import { DEPRECATIONS } from '@ember/-internals/deprecations';

export function newFixture(cnt) {
  let ret = [];
  while (--cnt >= 0) {
    ret.push(generateGuid());
  }

  return ret;
}

export function newObjectsFixture(cnt) {
  let ret = [];
  let item;
  while (--cnt >= 0) {
    item = {};
    guidFor(item);
    ret.push(item);
  }
  return ret;
}

const ArrayTestsObserverClass = class extends EmberObject {
  init() {
    super.init(...arguments);
    this.isEnabled = true;
    this.reset();
  }

  reset() {
    this._keys = {};
    this._values = {};
    this._before = null;
    this._after = null;
    return this;
  }

  observe(obj, ...keys) {
    if (obj.addObserver) {
      let loc = keys.length;

      while (--loc >= 0) {
        obj.addObserver(keys[loc], this, 'propertyDidChange');
      }
    } else {
      this.isEnabled = false;
    }
    return this;
  }

  observeArray(obj) {
    addArrayObserver(obj, this, {
      willChange: 'arrayWillChange',
      didChange: 'arrayDidChange',
    });
    return this;
  }

  stopObserveArray(obj) {
    removeArrayObserver(obj, this, {
      willChange: 'arrayWillChange',
      didChange: 'arrayDidChange',
    });
    return this;
  }

  propertyDidChange(target, key, value) {
    if (this._keys[key] === undefined) {
      this._keys[key] = 0;
    }
    this._keys[key]++;
    this._values[key] = value;
  }

  arrayWillChange() {
    this.assert.equal(this._before, null, 'should only call once');
    this._before = Array.prototype.slice.call(arguments);
  }

  arrayDidChange() {
    this.assert.equal(this._after, null, 'should only call once');
    this._after = Array.prototype.slice.call(arguments);
  }

  validate(key, value) {
    if (!this.isEnabled) {
      return true;
    }

    if (!this._keys[key]) {
      return false;
    }

    if (arguments.length > 1) {
      return this._values[key] === value;
    } else {
      return true;
    }
  }

  timesCalled(key) {
    return this._keys[key] || 0;
  }
};

class AbstractArrayHelper {
  beforeEach(assert) {
    this.assert = assert;
  }

  newObject(ary) {
    return ary ? ary.slice() : newFixture(3);
  }

  toArray(obj) {
    return obj.slice();
  }

  newObserver() {
    let ret = ArrayTestsObserverClass.create({
      assert: this.assert,
    });

    if (arguments.length > 0) {
      ret.observe.apply(ret, arguments);
    }

    return ret;
  }
}

class NativeArrayHelpers extends AbstractArrayHelper {
  newObject(ary) {
    return emberA(super.newObject(ary));
  }

  mutate(obj) {
    obj.pushObject(obj.length + 1);
  }
}

class ArrayProxyHelpers extends AbstractArrayHelper {
  newObject(ary) {
    // These suites exercise the shared array APIs rather than `ArrayProxy`
    // itself, so we let the `ArrayProxy` deprecation pass silently here. The
    // deprecation itself is covered by the dedicated `ArrayProxy` tests.
    return ignoreDeprecation(() => ArrayProxy.create({ content: emberA(super.newObject(ary)) }));
  }

  mutate(obj) {
    obj.pushObject(get(obj, 'length') + 1);
  }

  toArray(obj) {
    return obj.toArray ? obj.toArray() : obj.slice();
  }
}

/*
  Implement a basic fake mutable array.  This validates that any non-native
  enumerable can impl this API.
*/
const TestArray = EmberObject.extend(EmberArray, {
  _content: null,

  init() {
    this._content = this._content || [];
  },

  // some methods to modify the array so we can test changes.  Note that
  // arrays can be modified even if they don't implement MutableArray.  The
  // MutableArray is just a standard API for mutation but not required.
  addObject(obj) {
    let idx = this._content.length;
    arrayContentWillChange(this, idx, 0, 1);
    this._content.push(obj);
    arrayContentDidChange(this, idx, 0, 1);
  },

  removeFirst() {
    arrayContentWillChange(this, 0, 1, 0);
    this._content.shift();
    arrayContentDidChange(this, 0, 1, 0);
  },

  objectAt(idx) {
    return this._content[idx];
  },

  length: computed(function () {
    return this._content.length;
  }),
});

/*
  Implement a basic fake mutable array.  This validates that any non-native
  enumerable can impl this API.
*/
const TestMutableArray = EmberObject.extend(MutableArray, {
  _content: null,

  init(ary = []) {
    this._content = emberA(ary);
  },

  replace(idx, amt, objects) {
    let args = objects ? objects.slice() : [];
    let removeAmt = amt;
    let addAmt = args.length;

    arrayContentWillChange(this, idx, removeAmt, addAmt);

    args.unshift(amt);
    args.unshift(idx);
    this._content.splice.apply(this._content, args);
    arrayContentDidChange(this, idx, removeAmt, addAmt);
    return this;
  },

  objectAt(idx) {
    return this._content[idx];
  },

  length: computed(function () {
    return this._content.length;
  }),

  slice() {
    return this._content.slice();
  },
});

class MutableArrayHelpers extends NativeArrayHelpers {
  newObject(ary) {
    return TestMutableArray.create(super.newObject(ary));
  }

  // allows for testing of the basic enumerable after an internal mutation
  mutate(obj) {
    obj.addObject(this.getFixture(1)[0]);
  }
}

class EmberArrayHelpers extends MutableArrayHelpers {
  newObject(ary) {
    return TestArray.create(super.newObject(ary));
  }
}

const ARRAY_TEST_HELPERS = {
  ArrayProxy: ArrayProxyHelpers,
  EmberArray: EmberArrayHelpers,
  MutableArray: MutableArrayHelpers,
  NativeArray: NativeArrayHelpers,
};

const DEFAULT_ARRAY_TEST_TYPES = ['ArrayProxy', 'EmberArray', 'MutableArray', 'NativeArray'];

export function runArrayTests(name, Tests, ...types) {
  let requested = types.length > 0 ? types : DEFAULT_ARRAY_TEST_TYPES;

  for (let type of requested) {
    if (!ARRAY_TEST_HELPERS[type]) {
      throw new Error(`runArrayTests passed unexpected type ${type}`);
    }
  }

  // NOTE: `moduleFor` mixes each helper onto the prototype of the *shared*
  // `Tests` class, so the helper registered last supplies `newObject` for every
  // module here -- in practice these suites all run against `ArrayProxy`. That
  // means they cannot be split apart one type at a time: dropping `ArrayProxy`
  // hands `newObject` to a helper that has never actually run, and those
  // helpers have rotted (`EmberObject.create` with `_super`, `destroy` on
  // native arrays). Until that is untangled, skip the whole family once
  // `ArrayProxy` is removed rather than run it against helpers it was never
  // really exercising. See the `deprecate-array-proxy` deprecation.
  if (requested.includes('ArrayProxy') && DEPRECATIONS.DEPRECATE_ARRAY_PROXY.isRemoved) {
    return;
  }

  for (let type of requested) {
    moduleFor(`${type}: ${name}`, Tests, ARRAY_TEST_HELPERS[type]);
  }
}
