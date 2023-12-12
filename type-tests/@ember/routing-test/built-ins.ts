import { LinkTo } from '@ember/routing';
import { expectTypeOf } from 'expect-type';

// Basic check taht we export both type and value correctly.
expectTypeOf(LinkTo).not.toBeUndefined();
expectTypeOf<LinkTo>().not.toBeUndefined();

// And that it is opaquified as we expect.
expectTypeOf(LinkTo.create()).toEqualTypeOf<never>();
expectTypeOf(LinkTo.toString()).toBeString();
