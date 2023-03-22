import type Location from '@ember/routing/location';
import type EmberObject from '@ember/object';
import HashLocation from '@ember/routing/hash-location';
import { expectTypeOf } from 'expect-type';
import type Owner from '@ember/owner';

// Good enough for tests
let owner = {} as Owner;

// This doesn't have any public API

let location = new HashLocation(owner);
expectTypeOf(location).toMatchTypeOf<EmberObject>();
expectTypeOf(location).toMatchTypeOf<Location>();
