import type EmberObject from '@ember/object';
import NoneLocation from '@ember/routing/none-location';
import type { ILocation } from '@ember/routing/location';
import { expectTypeOf } from 'expect-type';
import type { InternalOwner } from '@ember/-internals/owner';

// Good enough for tests
let owner = {} as InternalOwner;

// This doesn't have any public API

let location = new NoneLocation(owner);
expectTypeOf(location).toMatchTypeOf<EmberObject>();
expectTypeOf(location).toMatchTypeOf<ILocation>();
