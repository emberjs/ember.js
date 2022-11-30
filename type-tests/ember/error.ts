import Ember from 'ember';
import { expectTypeOf } from 'expect-type';

// uhhh, yeah.
expectTypeOf(Ember.Error).toEqualTypeOf<typeof Ember.Error>();
