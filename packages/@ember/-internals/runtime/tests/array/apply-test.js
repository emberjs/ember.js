import { NativeArray } from '../../lib/mixins/array';
import { AbstractTestCase, moduleFor } from 'internal-test-helpers';

class ArrayPrototypeExtensionSelfReferenceTests extends AbstractTestCase {
  '@test should not create non-Symbol, enumerable properties that refer to itself'() {
    // Don't want to pollute Array.prototype so we make a fake / simple prototype
    function ThrowAwayArray() {}

    // Extend our throw-away prototype (like EXTEND_PROTOTYPES.Array would)
    NativeArray.apply(ThrowAwayArray.prototype);

    // Create an instance to test
    let obj = new ThrowAwayArray();

    // Make sure that no enumerable properties refer back to the object (creating a cyclic structure)
    for (let p in obj) {
      this.assert.notStrictEqual(
        obj[p],
        obj,
        `Property "${p}" is an enumerable part of the prototype
        so must not refer back to the original array.
        Otherwise code that explores all properties,
        such as jQuery.extend and other "deep cloning" functions,
        will get stuck in an infinite loop.
        `.replace(/\s+/g, ' ')
      );
    }
  }
}

moduleFor(`NativeArray: apply`, ArrayPrototypeExtensionSelfReferenceTests);
