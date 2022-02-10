import { Owner } from '@ember/-internals/owner';
import EmberObject from '@ember/object';
import AutoLocation from '@ember/routing/auto-location';
import { ILocation } from '@ember/routing/location';
import { expectTypeOf } from 'expect-type';

// Good enough for tests
let owner = {} as Owner;

// This doesn't have any public API

let location = new AutoLocation(owner);
expectTypeOf(location).toMatchTypeOf<EmberObject>();
expectTypeOf(location).toMatchTypeOf<ILocation>();
