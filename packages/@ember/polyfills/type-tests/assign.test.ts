import { assign } from '@ember/polyfills';
import { expectTypeOf } from 'expect-type';

// NOTE: Actual types could be better, but this is deprecated.

let a = { first: 'Yehuda' };
let b = { last: 'Katz' };
let c = { company: 'Other Company' };
let d = { company: 'Tilde Inc.' };
expectTypeOf(assign(a, b, c, d)).toEqualTypeOf<{
  first: string;
  last: string;
  company: string;
}>();
