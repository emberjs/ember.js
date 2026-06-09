import {
  array,
  type ArrayHelper,
  concat,
  type ConcatHelper,
  fn,
  type FnHelper,
  get,
  type GetHelper,
  hash,
  type HashHelper,
  makeContext,
  type Context,
  uniqueId,
  type UniqueIdHelper,
} from '@ember/helper';
import { expectTypeOf } from 'expect-type';

expectTypeOf(array).toEqualTypeOf<ArrayHelper>();
expectTypeOf(concat).toEqualTypeOf<ConcatHelper>();
expectTypeOf(fn).toEqualTypeOf<FnHelper>();
expectTypeOf(get).toEqualTypeOf<GetHelper>();
expectTypeOf(hash).toEqualTypeOf<HashHelper>();
expectTypeOf(uniqueId).toEqualTypeOf<UniqueIdHelper>();

// makeContext takes a type parameter, not a value -- the value is supplied
// at render time via `<Provide @value>`.
class Theme {
  color = 'dark';
}
const theme = makeContext<Theme>();
expectTypeOf(theme).toEqualTypeOf<Context<Theme>>();
expectTypeOf(theme.consume()).toEqualTypeOf<Theme>();

// @ts-expect-error makeContext no longer accepts a class (or any value) argument
makeContext(Theme);
