import { ILocation } from '@ember/routing/location';
import EmberObject from '@ember/object';
import HashLocation from '@ember/routing/hash-location';
import { expectTypeOf } from 'expect-type';
import EngineInstance from '@ember/engine/instance';

// Good enough for tests
let owner = {} as EngineInstance;

// This doesn't have any public API

let location = new HashLocation(owner);
expectTypeOf(location).toMatchTypeOf<EmberObject>();
expectTypeOf(location).toMatchTypeOf<ILocation>();
