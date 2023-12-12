import { destroy, registerDestructor } from '@ember/destroyable';
import { expectTypeOf } from 'expect-type';

let obj = {};

registerDestructor(obj, () => {
  /* Will get called when destroyed */
});

expectTypeOf(destroy(obj)).toEqualTypeOf<void>();

// @ts-expect-error not destroyable
destroy(1);
// @ts-expect-error requires arg
destroy();
