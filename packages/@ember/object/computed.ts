import { deprecateEmberObject } from '@ember/-internals/deprecations';
import type { AnyFn } from '@ember/-internals/utility-types';
import internalAlias from '@ember/-internals/metal/lib/alias';
import * as macros from './lib/computed/computed_macros';
import * as reduceMacros from './lib/computed/reduce_computed_macros';

export { ComputedProperty as default } from '@ember/-internals/metal/lib/computed';
export { default as expandProperties } from '@ember/-internals/metal/lib/expand_properties';

/**
  Makes the public version of a macro. Ember's own code imports the macros
  from `./lib/computed`, which do not report the deprecation.
*/
function deprecated<T extends AnyFn>(name: string, macro: T): T {
  return function (this: unknown, ...args: unknown[]) {
    deprecateEmberObject(`The \`${name}\` macro from \`@ember/object/computed\``);
    return macro.apply(this, args);
  } as T;
}

export const alias = deprecated('alias', internalAlias);

export const empty = deprecated('empty', macros.empty);
export const notEmpty = deprecated('notEmpty', macros.notEmpty);
export const none = deprecated('none', macros.none);
export const not = deprecated('not', macros.not);
export const bool = deprecated('bool', macros.bool);
export const match = deprecated('match', macros.match);
export const equal = deprecated('equal', macros.equal);
export const gt = deprecated('gt', macros.gt);
export const gte = deprecated('gte', macros.gte);
export const lt = deprecated('lt', macros.lt);
export const lte = deprecated('lte', macros.lte);
export const oneWay = deprecated('oneWay', macros.oneWay);
export const readOnly = deprecated('readOnly', macros.readOnly);
export const deprecatingAlias = deprecated('deprecatingAlias', macros.deprecatingAlias);
export const and = deprecated('and', macros.and);
export const or = deprecated('or', macros.or);
export const reads = deprecated('reads', macros.oneWay);

export const sum = deprecated('sum', reduceMacros.sum);
export const min = deprecated('min', reduceMacros.min);
export const max = deprecated('max', reduceMacros.max);
export const map = deprecated('map', reduceMacros.map);
export const sort = deprecated('sort', reduceMacros.sort);
export const setDiff = deprecated('setDiff', reduceMacros.setDiff);
export const mapBy = deprecated('mapBy', reduceMacros.mapBy);
export const filter = deprecated('filter', reduceMacros.filter);
export const filterBy = deprecated('filterBy', reduceMacros.filterBy);
export const uniq = deprecated('uniq', reduceMacros.uniq);
export const uniqBy = deprecated('uniqBy', reduceMacros.uniqBy);
export const union = deprecated('union', reduceMacros.union);
export const intersect = deprecated('intersect', reduceMacros.intersect);
export const collect = deprecated('collect', reduceMacros.collect);
