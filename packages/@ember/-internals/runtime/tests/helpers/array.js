import { generateGuid, guidFor } from '@ember/-internals/utils';
import { addArrayObserver, removeArrayObserver } from '@ember/-internals/metal';
import EmberObject from '@ember/object';
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
    return super.newObject(ary);
  }

  mutate(obj) {
    obj.pushObject(obj.length + 1);
  }
}

export function runArrayTests(name, Tests, ...types) {
  if (types.length > 0) {
    types.forEach((type) => {
      switch (type) {
        case 'NativeArray':
          moduleFor(`NativeArray: ${name}`, Tests, NativeArrayHelpers);
          break;
        default:
          throw new Error(`runArrayTests passed unexpected type ${type}`);
      }
    });
  } else {
    moduleFor(`NativeArray: ${name}`, Tests, NativeArrayHelpers);
  }
}
