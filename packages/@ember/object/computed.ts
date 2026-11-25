import { ComputedProperty } from '@ember/-internals/metal/lib/computed';
import internalExpandProperties from '@ember/-internals/metal/lib/expand_properties';
import { assert } from '@ember/debug';
import internalAlias, { type AliasDecorator } from '@ember/-internals/metal/lib/alias';
import { isDecoratorCall } from '@ember/-internals/metal/lib/decorator';
import * as macros from './lib/computed/computed_macros';
import * as arrayMacros from './lib/computed/reduce_computed_macros';

const ExportedComputedProperty = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : ComputedProperty
) as typeof ComputedProperty;
type ExportedComputedProperty = ComputedProperty;

export default ExportedComputedProperty;

export const expandProperties = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : internalExpandProperties
) as typeof internalExpandProperties;

function aliasMacro(altKey: string): AliasDecorator {
  assert(
    'You attempted to use @alias as a decorator directly, but it requires a `altKey` parameter',
    !isDecoratorCall(Array.prototype.slice.call(arguments))
  );

  macros.deprecateComputedMacro('alias');

  return internalAlias(altKey);
}

export const empty = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : macros.empty
) as typeof macros.empty;
export const notEmpty = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : macros.notEmpty
) as typeof macros.notEmpty;
export const none = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : macros.none
) as typeof macros.none;

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

export const sum = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : arrayMacros.sum
) as typeof arrayMacros.sum;

export const min = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : arrayMacros.min
) as typeof arrayMacros.min;

export const max = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : arrayMacros.max
) as typeof arrayMacros.max;

export const map = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : arrayMacros.map
) as typeof arrayMacros.map;

export const sort = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : arrayMacros.sort
) as typeof arrayMacros.sort;

export const setDiff = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : arrayMacros.setDiff
) as typeof arrayMacros.setDiff;

export const mapBy = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : arrayMacros.mapBy
) as typeof arrayMacros.mapBy;

export const filter = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : arrayMacros.filter
) as typeof arrayMacros.filter;

export const filterBy = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : arrayMacros.filterBy
) as typeof arrayMacros.filterBy;

export const uniq = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : arrayMacros.uniq
) as typeof arrayMacros.uniq;

export const uniqBy = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : arrayMacros.uniqBy
) as typeof arrayMacros.uniqBy;

export const union = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : arrayMacros.union
) as typeof arrayMacros.union;

export const intersect = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : arrayMacros.intersect
) as typeof arrayMacros.intersect;

export const collect = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : arrayMacros.collect
) as typeof arrayMacros.collect;
