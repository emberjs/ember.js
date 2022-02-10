import EmberObject from '@ember/object';
import NoneLocation from '@ember/routing/none-location';
import { ILocation } from '@ember/routing/location';
import { expectTypeOf } from 'expect-type';
import EngineInstance from '@ember/engine/instance';

// Good enough for tests
let owner = {} as EngineInstance;

// This doesn't have any public API

let location = new NoneLocation(owner);
expectTypeOf(location).toMatchTypeOf<EmberObject>();
expectTypeOf(location).toMatchTypeOf<ILocation>();
