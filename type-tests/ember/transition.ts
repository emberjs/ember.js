import Ember from 'ember';
import type Transition from '@ember/routing/transition';
import { expectTypeOf } from 'expect-type';

expectTypeOf<Parameters<Ember.Route['beforeModel']>[0]>().toEqualTypeOf<Transition>();
