import { deprecateUntil, DEPRECATIONS } from '@ember/-internals/deprecations';
import type { AnyFn } from '@ember/-internals/utility-types';
import metalExpandProperties from '@ember/-internals/metal/lib/expand_properties';
import metalAlias from '@ember/-internals/metal/lib/alias';
import {
  empty as _empty,
  notEmpty as _notEmpty,
  none as _none,
  not as _not,
  bool as _bool,
  match as _match,
  equal as _equal,
  gt as _gt,
  gte as _gte,
  lt as _lt,
  lte as _lte,
  oneWay as _oneWay,
  readOnly as _readOnly,
  deprecatingAlias as _deprecatingAlias,
  and as _and,
  or as _or,
} from './lib/computed/computed_macros';
import {
  sum as _sum,
  min as _min,
  max as _max,
  map as _map,
  sort as _sort,
  setDiff as _setDiff,
  mapBy as _mapBy,
  filter as _filter,
  filterBy as _filterBy,
  uniq as _uniq,
  uniqBy as _uniqBy,
  union as _union,
  intersect as _intersect,
  collect as _collect,
} from './lib/computed/reduce_computed_macros';

// Call-time deprecation wrappers, one per macro, rather than a single
// module-eval deprecation: consumer bundlers treat this module as
// side-effect-free (see `sideEffects` in package.json) and are allowed to
// drop top-level statements when only re-exports are used. ember-source's
// own internals import the underlying lib modules directly and stay silent.
function deprecatedMacro<F extends AnyFn>(macro: F): F {
  return function (this: unknown, ...args: unknown[]) {
    deprecateUntil(
      'Computed property macros are deprecated. Replace them with `@tracked` properties and native getters (with `@cached` where memoization is needed).',
      DEPRECATIONS.DEPRECATE_COMPUTED_PROPERTIES
    );
    return macro.apply(this, args);
  } as F;
}

export { ComputedProperty as default } from '@ember/-internals/metal/lib/computed';

export const expandProperties = deprecatedMacro(metalExpandProperties);
export const alias = deprecatedMacro(metalAlias);

export const empty = deprecatedMacro(_empty);
export const notEmpty = deprecatedMacro(_notEmpty);
export const none = deprecatedMacro(_none);
export const not = deprecatedMacro(_not);
export const bool = deprecatedMacro(_bool);
export const match = deprecatedMacro(_match);
export const equal = deprecatedMacro(_equal);
export const gt = deprecatedMacro(_gt);
export const gte = deprecatedMacro(_gte);
export const lt = deprecatedMacro(_lt);
export const lte = deprecatedMacro(_lte);
export const oneWay = deprecatedMacro(_oneWay);
export { oneWay as reads };
export const readOnly = deprecatedMacro(_readOnly);
export const deprecatingAlias = deprecatedMacro(_deprecatingAlias);
export const and = deprecatedMacro(_and);
export const or = deprecatedMacro(_or);

export const sum = deprecatedMacro(_sum);
export const min = deprecatedMacro(_min);
export const max = deprecatedMacro(_max);
export const map = deprecatedMacro(_map);
export const sort = deprecatedMacro(_sort);
export const setDiff = deprecatedMacro(_setDiff);
export const mapBy = deprecatedMacro(_mapBy);
export const filter = deprecatedMacro(_filter);
export const filterBy = deprecatedMacro(_filterBy);
export const uniq = deprecatedMacro(_uniq);
export const uniqBy = deprecatedMacro(_uniqBy);
export const union = deprecatedMacro(_union);
export const intersect = deprecatedMacro(_intersect);
export const collect = deprecatedMacro(_collect);
