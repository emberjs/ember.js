import { VERSION } from '@ember/version';
import { expectTypeOf } from 'expect-type';

expectTypeOf(VERSION).toEqualTypeOf<string>();
