/**
@module ember
*/
import { tagForProperty } from '@ember/-internals/metal';
import { isObject } from '@ember/-internals/utils';
import { CapturedArguments } from '@glimmer/interfaces';
import { createComputeRef, valueForRef } from '@glimmer/reference';
import { consumeTag } from '@glimmer/validator';
import { internalHelper } from './internal-helper';

/**
  This reference is used to get the `[]` tag of iterables, so we can trigger
  updates to `{{each}}` when it changes. It is put into place by a template
  transform at build time, similar to the (-each-in) helper
*/
export default internalHelper(({ positional }: CapturedArguments) => {
  let inner = positional[0];

  return createComputeRef(() => {
    let iterable = valueForRef(inner);

    if (isObject(iterable)) {
      consumeTag(tagForProperty(iterable, '[]'));
    }

    return iterable;
  });
});
