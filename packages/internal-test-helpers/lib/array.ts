import { NativeArray } from '@ember/array';
import { isEmberArray } from '@ember/array/-internals';
import { disableDeprecations } from '@ember/-internals/utils/lib/mixin-deprecation';

// Copy of Ember.A without the deprecation, for use here since it's hard to trap deprecations in some places in this test.
export function emberAWithoutDeprecation<T>(this: unknown, arr?: Array<T>) {
  if (isEmberArray(arr)) {
    // SAFETY: If it's a true native array and it is also an EmberArray then it should be an Ember NativeArray
    return arr as unknown as NativeArray<T>;
  } else {
    // SAFETY: This will return an NativeArray but TS can't infer that.
    return disableDeprecations(() => NativeArray.apply(arr ?? []) as NativeArray<T>);
  }
}
