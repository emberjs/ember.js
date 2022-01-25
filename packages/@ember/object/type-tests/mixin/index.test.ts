import { expectTypeOf } from 'expect-type';

import Mixin from '@ember/object/mixin';

const newMixin = Mixin.create({
  foo: 'bar',
});

expectTypeOf(newMixin).toMatchTypeOf<Mixin>();
