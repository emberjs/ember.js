import { destroy, isDestroyed } from '@ember/destroyable';
import { expectTypeOf } from 'expect-type';

let obj = {};

expectTypeOf(isDestroyed(obj)).toEqualTypeOf<boolean>(); // false
destroy(obj);

// ...sometime later, after scheduled destruction

expectTypeOf(isDestroyed(obj)).toEqualTypeOf<boolean>(); // true

// @ts-expect-error requires a destroyable value
isDestroyed(1);
// @ts-expect-error requires a value
isDestroyed();
