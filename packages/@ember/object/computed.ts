import { deprecateUntil, DEPRECATIONS } from '@ember/-internals/deprecations';

// Fires once per app load, when anything imports this module: the whole
// computed-property macro surface is deprecated together.
deprecateUntil(
  'Importing from `@ember/object/computed` is deprecated. Computed property macros are part of the classic object model; replace them with `@tracked` properties and native getters (with `@cached` where memoization is needed).',
  DEPRECATIONS.DEPRECATE_COMPUTED_PROPERTIES
);

export { ComputedProperty as default } from '@ember/-internals/metal/lib/computed';
export { default as expandProperties } from '@ember/-internals/metal/lib/expand_properties';
export { default as alias } from '@ember/-internals/metal/lib/alias';

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
