import type Owner from '@ember/owner';
import type EmberObject from '@ember/object';
import HistoryLocation from '@ember/routing/history-location';
import type Location from '@ember/routing/location';
import { expectTypeOf } from 'expect-type';

// Good enough for tests
let owner = {} as Owner;

// This doesn't have any public API

let location = new HistoryLocation(owner);
expectTypeOf(location).toMatchTypeOf<EmberObject>();
expectTypeOf(location).toMatchTypeOf<Location>();
