import Ember from 'ember';

import { expectTypeOf } from 'expect-type';

expectTypeOf(Ember.onerror).toEqualTypeOf<Function | undefined>();

expectTypeOf(Ember.HTMLBars).toMatchTypeOf<object>();
