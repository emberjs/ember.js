import { runInDebug } from '@ember/debug';
import { expectTypeOf } from 'expect-type';

let ret = runInDebug(() => {
  // Do expensive thing
});
expectTypeOf(ret).toEqualTypeOf<void>();

// @ts-expect-error no arguments to callbacks
runInDebug((_foo: boolean) => {});
