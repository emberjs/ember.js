import type EmberObject from '@ember/object';
import NoneLocation from '@ember/routing/none-location';
import type Location from '@ember/routing/location';
import { expectTypeOf } from 'expect-type';
import type Owner from '@ember/owner';

// Good enough for tests
let owner = {} as Owner;

// This doesn't have any public API

let location = new NoneLocation(owner);
expectTypeOf(location).toMatchTypeOf<EmberObject>();
expectTypeOf(location).toMatchTypeOf<Location>();
