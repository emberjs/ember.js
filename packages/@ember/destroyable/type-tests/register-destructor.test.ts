import { destroy, registerDestructor } from '@ember/destroyable';
import { expectTypeOf } from 'expect-type';

class Foo {}
let obj = new Foo();

expectTypeOf(
  registerDestructor(obj, () => {
    /* Will get called when destroyed */
  })
).toEqualTypeOf<(destroyable: {}) => void>();

registerDestructor(obj, (_obj: Foo) => {});

destroy(obj);

// @ts-expect-error not destroyable
registerDestructor(1, () => {});

// @ts-expect-error requires object
registerDestructor(() => {});

// @ts-expect-error requires callback
registerDestructor(obj);

// @ts-expect-error invalid callback
registerDestructor(obj, (blah: number) => {});
