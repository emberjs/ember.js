import { Owner } from '@ember/-internals/owner';
import { setComponentManager } from '@ember/component';
import { ComponentManager } from '@glimmer/interfaces';
import { expectTypeOf } from 'expect-type';

// Obviously this is invalid, but it works for our purposes.
let manager = {} as ComponentManager<unknown>;

class Foo {}
let foo = new Foo();

expectTypeOf(setComponentManager((_owner: Owner) => manager, foo)).toEqualTypeOf<Foo>();

// @ts-expect-error invalid callback
setComponentManager(() => {
  return {};
}, foo);
