export { ComputedProperty as default } from '@ember/-internals/metal/lib/computed';
export { default as expandProperties } from '@ember/-internals/metal/lib/expand_properties';

import { assert } from '@ember/debug';
import internalAlias, { type AliasDecorator } from '@ember/-internals/metal/lib/alias';
import { isDecoratorCall } from '@ember/-internals/metal/lib/decorator';
import * as macros from './lib/computed/computed_macros';

function aliasMacro(altKey: string): AliasDecorator {
  assert(
    'You attempted to use @alias as a decorator directly, but it requires a `altKey` parameter',
    !isDecoratorCall(Array.prototype.slice.call(arguments))
  );

  macros.deprecateComputedMacro('alias');

  return internalAlias(altKey);
}

export { empty, notEmpty, none } from './lib/computed/computed_macros';

export const alias = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : aliasMacro
) as typeof aliasMacro;
export const not = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : macros.not
) as typeof macros.not;
export const bool = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : macros.bool
) as typeof macros.bool;
export const match = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : macros.match
) as typeof macros.match;
export const equal = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : macros.equal
) as typeof macros.equal;
export const gt = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : macros.gt
) as typeof macros.gt;
export const gte = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : macros.gte
) as typeof macros.gte;
export const lt = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : macros.lt
) as typeof macros.lt;
export const lte = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : macros.lte
) as typeof macros.lte;
export const oneWay = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : macros.oneWay
) as typeof macros.oneWay;
export const reads = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : macros.oneWay
) as typeof macros.oneWay;
export const readOnly = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : macros.readOnly
) as typeof macros.readOnly;
export const deprecatingAlias = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : macros.deprecatingAlias
) as typeof macros.deprecatingAlias;
export const and = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : macros.and
) as typeof macros.and;
export const or = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : macros.or
) as typeof macros.or;

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
