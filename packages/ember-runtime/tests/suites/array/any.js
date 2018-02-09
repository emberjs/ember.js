// import { SuiteModuleBuilder } from '../suite';
import { A as emberA } from '../../../mixins/array';
import { get } from 'ember-metal';
import { AbstractTestCase, moduleFor } from 'internal-test-helpers';
import { generateGuid } from 'ember-utils';
import ArrayProxy from '../../../system/array_proxy';

// const suite = SuiteModuleBuilder.create();

// ..........................................................
// any()
//

// class AbstractArrayHelpers {
//   newObject() {
//     throw new Error('Must implement');
//   }

//   toArray() {
//     throw new Error('Must implement');
//   }
// }

// class AbstractArrayTests extends AbstractTestCase {
//   constructor(ArrayHelpers) {
//     super();
//     this.ArrayHelpers = ArrayHelpers;
//   }

//   newObject() {
//     return new this.ArrayHelpers().newObject(...arguments);
//   }

//   toArray() {
//     return new this.ArrayHelpers().toArray(...arguments);
//   }
// }

class NativeArrayHelpers {
  newObject(ary) {
    return emberA(ary ? ary.slice() : this.newFixture(3));
  }

  newFixture(cnt) {
    let ret = [];
    while (--cnt >= 0) {
      ret.push(generateGuid());
    }

    return ret;
  }

  mutate(obj) {
    obj.pushObject(obj.length + 1);
  }

  toArray(obj) {
    return obj.slice();
  }
}

class AbstractArrayHelper {
  newFixture(cnt) {
    let ret = [];
    while (--cnt >= 0) {
      ret.push(generateGuid());
    }

    return ret;
  }
}

class ArrayProxyHelpers extends AbstractArrayHelper {
  newObject(ary) {
    let ret = ary ? ary.slice() : this.newFixture(3);
    return ArrayProxy.create({ content: emberA(ret) });
  }

  mutate(obj) {
    obj.pushObject(get(obj, 'length') + 1);
  }

  toArray(obj) {
    return obj.toArray ? obj.toArray() : obj.slice();
  }
}

// class ArrayProxyTests extends AbstractArrayTests {
//   newObject(ary) {
//     let ret = ary ? ary.slice() : this.newFixture(3);
//     return ArrayProxy.create({ content: emberA(ret) });
//   }

//   mutate(obj) {
//     obj.pushObject(get(obj, 'length') + 1);
//   }

//   toArray(obj) {
//     return obj.toArray ? obj.toArray() : obj.slice();
//   }
// }


// function f(K, S) {
//   return class K extends S {

//   };
// }

// moduleFor('any', f(class {
//   d() {
//     this.newObject();
//   }
// }, ArrayProxyTests));

class AnyTests extends AbstractTestCase {
  '@test any should should invoke callback on each item as long as you return false'() {
    let obj = this.newObject();
    let ary = this.toArray(obj);
    let found = [];
    let result;

    result = obj.any(function(i) {
      found.push(i);
      return false;
    });

    this.assert.equal(result, false, 'return value of obj.any');
    this.assert.deepEqual(found, ary, 'items passed during any() should match');
  }

  '@test any should stop invoking when you return true'() {
    let obj = this.newObject();
    let ary = this.toArray(obj);
    let cnt = ary.length - 2;
    let exp = cnt;
    let found = [];
    let result;

    result = obj.any(function(i) {
      found.push(i);
      return --cnt <= 0;
    });
    this.assert.equal(result, true, 'return value of obj.any');
    this.assert.equal(found.length, exp, 'should invoke proper number of times');
    this.assert.deepEqual(found, ary.slice(0, -2), 'items passed during any() should match');
  }

  '@test any should return true if any object matches the callback'() {
    let obj = emberA([0, 1, 2]);
    let result;

    result = obj.any(i => !!i);
    this.assert.equal(result, true, 'return value of obj.any');
  }

  '@test any should produce correct results even if the matching element is undefined'(assert) {
    let obj = emberA([undefined]);
    let result;

    result = obj.any(() => true);
    assert.equal(result, true, 'return value of obj.any');
  }
}

moduleFor('[NEW] NativeArray: any', AnyTests, NativeArrayHelpers);
moduleFor('[NEW] ArrayProxy: any', AnyTests, ArrayProxyHelpers);