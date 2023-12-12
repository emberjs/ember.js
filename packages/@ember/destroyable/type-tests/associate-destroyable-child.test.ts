import { associateDestroyableChild } from '@ember/destroyable';
import { expectTypeOf } from 'expect-type';

class Foo {}
class Bar {}

let foo = new Foo();
let bar = new Bar();

expectTypeOf(associateDestroyableChild(foo, bar)).toEqualTypeOf<Bar>();
// @ts-expect-error number is not destroyable
associateDestroyableChild(1, bar);
// @ts-expect-error number is not destroyable
associateDestroyableChild(foo, 1);
// @ts-expect-error two values required
associateDestroyableChild(foo);
