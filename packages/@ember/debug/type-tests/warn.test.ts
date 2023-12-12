import { warn } from '@ember/debug';
import { expectTypeOf } from 'expect-type';

let foo = true;
let ret = warn('Too much foo!', foo, {
  id: 'ember-debug.too-much-foo',
});
expectTypeOf(ret).toEqualTypeOf<void>();

warn('No options');

// @ts-expect-error Invalid condition
warn('Invalid condition', { id: 1 });

// @ts-expect-error Invalid options
warn('Invalid options', true, { id: 1 });
