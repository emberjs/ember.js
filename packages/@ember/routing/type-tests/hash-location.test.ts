import { ILocation } from '@ember/routing/location';
import EmberObject from '@ember/object';
import HashLocation from '@ember/routing/hash-location';
import { expectTypeOf } from 'expect-type';

// This doesn't have any public API

let location = new HashLocation();
expectTypeOf(location).toMatchTypeOf<EmberObject>();
expectTypeOf(location).toMatchTypeOf<ILocation>();
