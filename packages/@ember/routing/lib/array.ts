import { disableDeprecations } from '@ember/-internals/utils/lib/mixin-deprecation';
import { NativeArray } from '@ember/array';
import { isEmberArray } from '@ember/array/-internals';

// Copy of Ember.A without the deprecation, for use just in `copyDefaultValue`
export function emberAWithoutDeprecation<T>(this: unknown, arr?: Array<T>): NativeArray<T> {
  if (isEmberArray(arr)) {
    // SAFETY: If it's a true native array and it is also an EmberArray then it should be an Ember NativeArray
    return arr as unknown as NativeArray<T>;
  } else {
    // SAFETY: This will return an NativeArray but TS can't infer that.
    return disableDeprecations(() => NativeArray.apply(arr ?? []) as NativeArray<T>);
  }
}
