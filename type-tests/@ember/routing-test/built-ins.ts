import { LinkTo } from '@ember/routing';
import { expectTypeOf } from 'expect-type';

// Basic check taht we export both type and value correctly.
expectTypeOf(LinkTo.create()).toEqualTypeOf<LinkTo>();
