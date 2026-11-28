import {
  array,
  type Context,
  createContext,
  type ArrayHelper,
  concat,
  type ConcatHelper,
  fn,
  type FnHelper,
  get,
  type GetHelper,
  hash,
  type HashHelper,
  setHelperManager,
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

type HelperManager = ReturnType<Parameters<typeof setHelperManager>[0]>;
expectTypeOf<HelperManager['capabilities']>().not.toBeAny();
expectTypeOf<Parameters<HelperManager['createHelper']>[1]>().not.toBeAny();

class Theme {
  color = 'dark';
}
const theme = createContext<Theme>();
expectTypeOf(theme).toEqualTypeOf<Context<Theme>>();
expectTypeOf(theme.value).toEqualTypeOf<Theme>();

// @ts-expect-error createContext takes no value; `<Provide @value>` supplies it
createContext(Theme);

// @ts-expect-error value is read-only
theme.value = new Theme();
