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
