import ArrayProxy from '../../system/array_proxy';
import EmberArray, {
  A as emberA,
  MutableArray,
  arrayContentDidChange,
  arrayContentWillChange
} from '../../mixins/array';
import { generateGuid } from 'ember-utils';
import { get } from 'ember-metal';
import { computed } from 'ember-metal';
import EmberObject from '../../system/object';
import { moduleFor } from 'internal-test-helpers';

export function newFixture(cnt) {
  let ret = [];
  while (--cnt >= 0) {
    ret.push(generateGuid());
  }

  return ret;
}

class AbstractArrayHelper {
  newObject(ary) {
    return ary ? ary.slice() : newFixture(3);
  }

  toArray(obj) {
    return obj.slice();
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

  length: computed(function() {
    return this._content.length;
  })
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
    let addAmt    = args.length;

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

  length: computed(function() {
    return this._content.length;
  }),

  slice() {
    return this._content.slice();
  }
});

class MutableArrayHelpers extends NativeArrayHelpers {
  newObject(ary) {
    return new TestMutableArray(super.newObject(ary));
  }

  // allows for testing of the basic enumerable after an internal mutation
  mutate(obj) {
    obj.addObject(this.getFixture(1)[0]);
  }
}

class EmberArrayHelpers extends MutableArrayHelpers {
  newObject(ary) {
    return new TestArray(super.newObject(ary));
  }
}

export function runArrayTests(name, Tests) {
  moduleFor(`ArrayProxy: ${name}`, Tests, ArrayProxyHelpers);
  moduleFor(`EmberArray: ${name}`, Tests, EmberArrayHelpers);
  moduleFor(`MutableArray: ${name}`, Tests, MutableArrayHelpers);
  moduleFor(`NativeArray: ${name}`, Tests, NativeArrayHelpers);
}