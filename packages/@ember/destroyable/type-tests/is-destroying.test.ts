import { destroy, isDestroying, isDestroyed } from '@ember/destroyable';
import { expectTypeOf } from 'expect-type';

let obj = {};

expectTypeOf(isDestroying(obj)).toEqualTypeOf<boolean>(); // false

destroy(obj);

isDestroying(obj); // true

// ...sometime later, after scheduled destruction
isDestroyed(obj); // true
isDestroying(obj); // true

// @ts-expect-error requires a destroyable value
isDestroying(1);
// @ts-expect-error requires a value
isDestroying();
