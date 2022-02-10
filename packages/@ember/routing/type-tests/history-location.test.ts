import EngineInstance from '@ember/engine/instance';
import EmberObject from '@ember/object';
import HistoryLocation from '@ember/routing/history-location';
import { ILocation } from '@ember/routing/location';
import { expectTypeOf } from 'expect-type';

// Good enough for tests
let owner = {} as EngineInstance;

// This doesn't have any public API

let location = new HistoryLocation(owner);
expectTypeOf(location).toMatchTypeOf<EmberObject>();
expectTypeOf(location).toMatchTypeOf<ILocation>();
