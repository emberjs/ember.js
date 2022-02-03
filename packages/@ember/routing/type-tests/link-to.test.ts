import { OpaqueInternalComponentConstructor } from '@ember/-internals/glimmer/lib/components/internal';
import { LinkTo } from '@ember/routing';
import { expectTypeOf } from 'expect-type';

// This type is weird
expectTypeOf(LinkTo).toEqualTypeOf<OpaqueInternalComponentConstructor>();
