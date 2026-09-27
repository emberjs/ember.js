import { isSimpleClick } from '@ember/-internals/views';
import { expectTypeOf } from 'expect-type';

expectTypeOf(isSimpleClick(new Event('wat'))).toBeBoolean();
