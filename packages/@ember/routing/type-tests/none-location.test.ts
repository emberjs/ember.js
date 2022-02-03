import EmberObject from '@ember/object';
import NoneLocation from '@ember/routing/none-location';
import { ILocation } from '@ember/routing/location';
import { expectTypeOf } from 'expect-type';

// This doesn't have any public API

let location = new NoneLocation();
expectTypeOf(location).toMatchTypeOf<EmberObject>();
expectTypeOf(location).toMatchTypeOf<ILocation>();
