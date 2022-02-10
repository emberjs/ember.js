import EmberObject from '@ember/object';
import AutoLocation from '@ember/routing/auto-location';
import { ILocation } from '@ember/routing/location';
import { expectTypeOf } from 'expect-type';

// This doesn't have any public API

let location = new AutoLocation();
expectTypeOf(location).toMatchTypeOf<EmberObject>();
expectTypeOf(location).toMatchTypeOf<ILocation>();
