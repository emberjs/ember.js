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
  createContext,
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

// createContext takes a type parameter, not a value -- the value is supplied
// at render time via `<Provide @value>`.
class Theme {
  color = 'dark';
}
const theme = createContext<Theme>();
expectTypeOf(theme).toEqualTypeOf<Context<Theme>>();
// `value` is a getter, not a function
expectTypeOf(theme.value).toEqualTypeOf<Theme>();

// @ts-expect-error createContext does not accept a class (or any value) argument
createContext(Theme);
