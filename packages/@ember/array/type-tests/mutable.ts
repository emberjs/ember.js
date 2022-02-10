import MutableArray from '@ember/array/mutable';
import { A } from '@ember/array';

import { expectTypeOf } from 'expect-type';

class Foo {}

let foo = new Foo();

let arr = A([foo]);

expectTypeOf(arr).toMatchTypeOf<MutableArray<Foo>>();

expectTypeOf(arr.replace(1, 1, [foo])).toEqualTypeOf<void>();
// TODO: Why doesn't this fail?
arr.replace(1, 1, ['invalid']);

expectTypeOf(arr.clear()).toEqualTypeOf(arr);

expectTypeOf(arr.insertAt(1, foo)).toEqualTypeOf(arr);

// TODO: Why doesn't this fail?
arr.insertAt(1, 'invalid');

expectTypeOf(arr.removeAt(1, 1)).toEqualTypeOf(arr);

expectTypeOf(arr.pushObject(foo)).toEqualTypeOf(arr);
// TODO: Why doesn't this fail?
arr.pushObject('invalid');

expectTypeOf(arr.pushObjects([foo])).toEqualTypeOf(arr);
// TODO: Why doesn't this fail?
arr.pushObjects(['invalid']);

expectTypeOf(arr.popObject()).toEqualTypeOf<Foo | undefined>();

expectTypeOf(arr.shiftObject()).toEqualTypeOf<Foo | null | undefined>();

expectTypeOf(arr.unshiftObject(foo)).toEqualTypeOf(arr);
// TODO: Why doesn't this fail?
arr.unshiftObject('invalid');

expectTypeOf(arr.unshiftObjects([foo])).toEqualTypeOf(arr);
// TODO: Why doesn't this fail?
arr.unshiftObjects(['invalid']);

expectTypeOf(arr.reverseObjects()).toEqualTypeOf(arr);

expectTypeOf(arr.setObjects([foo])).toEqualTypeOf(arr);
// TODO: Why doesn't this fail?
arr.setObjects(['invalid']);

expectTypeOf(arr.removeObject(foo)).toEqualTypeOf(arr);
// TODO: Why doesn't this fail?
arr.removeObject('invalid');

expectTypeOf(arr.addObject(foo)).toEqualTypeOf(arr);
// TODO: Why doesn't this fail?
arr.addObject('invalid');

expectTypeOf(arr.addObjects([foo])).toEqualTypeOf(arr);
// TODO: Why doesn't this fail?
arr.addObjects(['invalid']);
