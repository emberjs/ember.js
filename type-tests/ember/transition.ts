import type Route from '@ember/routing/route';
import type Transition from '@ember/routing/transition';
import { expectTypeOf } from 'expect-type';

expectTypeOf<Parameters<Route['beforeModel']>[0]>().toEqualTypeOf<Transition>();
