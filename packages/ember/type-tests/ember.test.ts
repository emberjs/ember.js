import Ember from 'ember';

import { expectTypeOf } from 'expect-type';

expectTypeOf(Ember.onerror).toEqualTypeOf<((error: Error) => unknown) | undefined>();

expectTypeOf(Ember.HTMLBars).toMatchTypeOf<object>();
