import { registerDestructor, unregisterDestructor } from '@ember/destroyable';
import { expectTypeOf } from 'expect-type';

class Foo {
  readonly type = 'foo';
}
let obj = new Foo();

let destructor = registerDestructor(obj, () => {
  /* Will get called when destroyed */
});

expectTypeOf(unregisterDestructor(obj, destructor)).toEqualTypeOf<void>();

// @ts-expect-error invalid destructor
unregisterDestructor(obj, 1);

// @ts-expect-error requires destructor
unregisterDestructor(obj);

// @ts-expect-error requires object
unregisterDestructor(destructor);

class Bar {
  readonly type = 'blah';
}
let obj2 = new Bar();

// @ts-expect-error destroyable type mismatch
unregisterDestructor(obj2, destructor);
