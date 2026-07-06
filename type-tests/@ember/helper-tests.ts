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
  captureContext,
  type Context,
  type CapturedContext,
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

// `consume()` with no argument reads ambiently, like `value`
expectTypeOf(theme.consume()).toEqualTypeOf<Theme>();

// `consume(captured)` resolves from a captured render-tree position
const captured = captureContext();
expectTypeOf(captured).toEqualTypeOf<CapturedContext>();
expectTypeOf(theme.consume(captured)).toEqualTypeOf<Theme>();

// captureContext takes no arguments
// @ts-expect-error
captureContext(theme);

// The capture is opaque -- arbitrary objects don't typecheck as one
// @ts-expect-error
theme.consume({});
