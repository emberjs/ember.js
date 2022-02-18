import { DEFAULT_FEATURES, FEATURES, isEnabled } from '@ember/canary-features';
import { expectTypeOf } from 'expect-type';

expectTypeOf(DEFAULT_FEATURES).toMatchTypeOf<Record<string, boolean | null>>();

expectTypeOf(FEATURES).toMatchTypeOf<Record<string, boolean | null>>();

expectTypeOf(isEnabled('foo')).toMatchTypeOf<boolean>();
