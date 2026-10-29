/**
@module @ember/array
*/
import EmberArray, { A, NativeArray, MutableArray } from '@ember/array/lib/ember-array';

export { default as makeArray } from './make';
export { uniqBy, removeAt } from '@ember/array/index-internal';
export { default as isArray } from '@ember/array/lib/is-array';
export type { EmberArrayLike } from '@ember/array/lib/ember-array';

/*
  Framework code imports these from `@ember/array/lib/ember-array`, so that it
  keeps working when the build flag removes these exports.
*/
const ExportedEmberArray = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : EmberArray
) as typeof EmberArray;
type ExportedEmberArray<T> = EmberArray<T>;

const ExportedMutableArray = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : MutableArray
) as typeof MutableArray;
type ExportedMutableArray<T> = MutableArray<T>;

const ExportedNativeArray = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : NativeArray
) as typeof NativeArray;
type ExportedNativeArray<T> = NativeArray<T>;

const ExportedA = (import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : A) as typeof A;

export { ExportedA as A, ExportedNativeArray as NativeArray, ExportedMutableArray as MutableArray };

export default ExportedEmberArray;
