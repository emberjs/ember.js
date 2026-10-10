export { ComputedProperty as default } from '@ember/-internals/metal/lib/computed';
export { default as expandProperties } from '@ember/-internals/metal/lib/expand_properties';

import { assert } from '@ember/debug';
import internalAlias, { type AliasDecorator } from '@ember/-internals/metal/lib/alias';
import { isDecoratorCall } from '@ember/-internals/metal/lib/decorator';
import { deprecateComputedMacro } from './lib/computed/computed_macros';

export function alias(altKey: string): AliasDecorator {
  assert(
    'You attempted to use @alias as a decorator directly, but it requires a `altKey` parameter',
    !isDecoratorCall(Array.prototype.slice.call(arguments))
  );

  deprecateComputedMacro('alias');

  return internalAlias(altKey);
}

export {
  empty,
  notEmpty,
  none,
  not,
  bool,
  match,
  equal,
  gt,
  gte,
  lt,
  lte,
  oneWay,
  oneWay as reads,
  readOnly,
  deprecatingAlias,
  and,
  or,
} from './lib/computed/computed_macros';

export {
  sum,
  min,
  max,
  map,
  sort,
  setDiff,
  mapBy,
  filter,
  filterBy,
  uniq,
  uniqBy,
  union,
  intersect,
  collect,
} from './lib/computed/reduce_computed_macros';
