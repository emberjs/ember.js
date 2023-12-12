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
import { moduleFor } from 'internal-test-helpers';

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

const ArrayTestsObserverClass = EmberObject.extend({
  init() {
    this._super(...arguments);
    this.isEnabled = true;
    this.reset();
  },

  reset() {
    this._keys = {};
    this._values = {};
    this._before = null;
    this._after = null;
    return this;
  },

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
  },

  observeArray(obj) {
    addArrayObserver(obj, this, {
      willChange: 'arrayWillChange',
      didChange: 'arrayDidChange',
    });
    return this;
  },

  stopObserveArray(obj) {
    removeArrayObserver(obj, this, {
      willChange: 'arrayWillChange',
      didChange: 'arrayDidChange',
    });
    return this;
  },

  propertyDidChange(target, key, value) {
    if (this._keys[key] === undefined) {
      this._keys[key] = 0;
    }
    this._keys[key]++;
    this._values[key] = value;
  },

  arrayWillChange() {
    this.assert.equal(this._before, null, 'should only call once');
    this._before = Array.prototype.slice.call(arguments);
  },

  arrayDidChange() {
    this.assert.equal(this._after, null, 'should only call once');
    this._after = Array.prototype.slice.call(arguments);
  },

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
  },

  timesCalled(key) {
    return this._keys[key] || 0;
  },
});

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
    return ArrayProxy.create({ content: emberA(super.newObject(ary)) });
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

export function runArrayTests(name, Tests, ...types) {
  if (types.length > 0) {
    types.forEach((type) => {
      switch (type) {
        case 'ArrayProxy':
          moduleFor(`ArrayProxy: ${name}`, Tests, ArrayProxyHelpers);
          break;
        case 'EmberArray':
          moduleFor(`EmberArray: ${name}`, Tests, EmberArrayHelpers);
          break;
        case 'MutableArray':
          moduleFor(`MutableArray: ${name}`, Tests, MutableArrayHelpers);
          break;
        case 'NativeArray':
          moduleFor(`NativeArray: ${name}`, Tests, NativeArrayHelpers);
          break;
        default:
          throw new Error(`runArrayTests passed unexpected type ${type}`);
      }
    });
  } else {
    moduleFor(`ArrayProxy: ${name}`, Tests, ArrayProxyHelpers);
    moduleFor(`EmberArray: ${name}`, Tests, EmberArrayHelpers);
    moduleFor(`MutableArray: ${name}`, Tests, MutableArrayHelpers);
    moduleFor(`NativeArray: ${name}`, Tests, NativeArrayHelpers);
  }
}
