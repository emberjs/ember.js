declare module '@ember/object/computed' {
  export { ComputedProperty as default, expandProperties, alias } from '@ember/-internals/metal';
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
  } from '@ember/object/lib/computed/computed_macros';
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
  } from '@ember/object/lib/computed/reduce_computed_macros';
}
