import type { Owner } from '@ember/-internals/owner';
import type EmberObject from '@ember/object';
import HistoryLocation from '@ember/routing/history-location';
import type { ILocation } from '@ember/routing/location';
import { expectTypeOf } from 'expect-type';

// Good enough for tests
let owner = {} as Owner;

// This doesn't have any public API

let location = new HistoryLocation(owner);
expectTypeOf(location).toMatchTypeOf<EmberObject>();
expectTypeOf(location).toMatchTypeOf<ILocation>();
