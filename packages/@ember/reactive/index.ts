export {
  trackedArray,
  trackedObject,
  trackedWeakSet,
  trackedSet,
  trackedMap,
  trackedWeakMap,
} from '@glimmer/validator';

/**
 * The `@ember/reactive` package contains common reactive utilities
 * for tracking values and creating reactive data structures.
 *
 * @module @ember/reactive
 * @public
 */

/**
 * A utility for creating tracked arrays, copying the original data so that
 * mutations to the tracked data don't mutate the original untracked data.
 *
 * `trackedArray` can be used in templates and in JavaScript via import.
 * All property accesses entangle with that property, all property sets dirty
 * that property, and changes to the collection only render what changed
 * without causing unneeded renders.
 *
 * See [MDN for more information](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)
 *
 * @example
 * ```javascript
 * import { trackedArray } from '@ember/reactive';
 * import { on } from '@ember/modifier';
 * import { fn } from '@ember/helper';
 *
 * const nonTrackedArray = [1, 2, 3];
 * const addTo = (arr) => arr.push(Math.random());
 *
 * <template>
 *     {{#let (trackedArray nonTrackedArray) as |arr|}}
 *         {{#each arr as |datum|}}
 *             {{datum}}
 *         {{/each}}
 *
 *         <button {{on 'click' (fn addTo arr)}}>Add Item</button>
 *     {{/let}}
 * </template>
 * ```
 *
 * @method trackedArray
 * @static
 * @for @ember/reactive
 * @param {Array} [data] The initial array data to track
 * @param {Object} [options] Optional configuration
 * @param {Function} [options.equals] Custom equality function (defaults to Object.is)
 * @param {String} [options.description] Description for debugging purposes
 * @returns {Array} A tracked array that updates reactively
 * @public
 */

/**
 * A utility for creating tracked objects, copying the original data so that
 * mutations to the tracked data don't mutate the original untracked data.
 *
 * `trackedObject` can be used in templates and in JavaScript via import.
 * All property accesses entangle with that property, all property sets dirty
 * that property, and changes to the collection only render what changed
 * without causing unneeded renders.
 *
 * See [MDN for more information](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
 *
 * @example
 * ```gjs
 * import { trackedObject } from '@ember/reactive';
 * import { on } from '@ember/modifier';
 * import { fn } from '@ember/helper';
 *
 * const nonTrackedObject = { a: 1 };
 * const addTo = (obj) => obj[Math.random()] = Math.random();
 *
 * <template>
 *     {{#let (trackedObject nonTrackedObject) as |obj|}}
 *         {{#each-in obj as |key value|}}
 *             {{key}} => {{value}}<br>
 *         {{/each-in}}
 *
 *         <button {{on 'click' (fn addTo obj)}}>Add Pair</button>
 *     {{/let}}
 * </template>
 * ```
 *
 * @method trackedObject
 * @static
 * @for @ember/reactive
 * @param {Object} [data] The initial object data to track
 * @param {Object} [options] Optional configuration
 * @param {Function} [options.equals] Custom equality function (defaults to Object.is)
 * @param {String} [options.description] Description for debugging purposes
 * @returns {Object} A tracked object that updates reactively
 * @public
 */

/**
 * A utility for creating tracked sets, copying the original data so that
 * mutations to the tracked data don't mutate the original untracked data.
 *
 * `trackedSet` can be used in templates and in JavaScript via import.
 * All property accesses entangle with that property, all property sets dirty
 * that property, and changes to the collection only render what changed
 * without causing unneeded renders.
 *
 * See [MDN for more information](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set)
 *
 * @example
 * ```gjs
 * import { trackedSet } from '@ember/reactive';
 * import { on } from '@ember/modifier';
 * import { fn } from '@ember/helper';
 *
 * const nonTrackedSet = new Set();
 * nonTrackedSet.add(1);
 * const addTo = (set) => set.add(Math.random());
 *
 * <template>
 *     {{#let (trackedSet nonTrackedSet) as |set|}}
 *         {{#each set as |value|}}
 *             {{value}}<br>
 *         {{/each}}
 *
 *         <button {{on 'click' (fn addTo set)}}>Add</button>
 *     {{/let}}
 * </template>
 * ```
 *
 * @method trackedSet
 * @static
 * @for @ember/reactive
 * @param {Set} [data] The initial Set data to track
 * @param {Object} [options] Optional configuration
 * @param {Function} [options.equals] Custom equality function (defaults to Object.is)
 * @param {String} [options.description] Description for debugging purposes
 * @returns {Set} A tracked Set that updates reactively
 * @public
 */

/**
 * A utility for creating tracked weak sets, copying the original data so that
 * mutations to the tracked data don't mutate the original untracked data.
 *
 * `trackedWeakSet` can be used in templates and in JavaScript via import.
 * All property accesses entangle with that property, all property sets dirty
 * that property, and changes to the collection only render what changed
 * without causing unneeded renders.
 *
 * WeakSets hold weak references to their values, allowing garbage collection
 * when objects are no longer referenced elsewhere.
 *
 * See [MDN for more information](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakSet)
 *
 * @example
 * ```gjs
 * import { trackedWeakSet } from '@ember/reactive';
 * import { on } from '@ember/modifier';
 * import { fn } from '@ember/helper';
 *
 * const nonTrackedWeakSet = new WeakSet();
 *
 * <template>
 *     {{#let (trackedWeakSet nonTrackedWeakSet) as |weakSet|}}
 *         {{log weakSet}}
 *     {{/let}}
 * </template>
 * ```
 *
 * @method trackedWeakSet
 * @static
 * @for @ember/reactive
 * @param {WeakSet} [data] The initial WeakSet data to track
 * @param {Object} [options] Optional configuration
 * @param {Function} [options.equals] Custom equality function (defaults to Object.is)
 * @param {String} [options.description] Description for debugging purposes
 * @returns {WeakSet} A tracked WeakSet that updates reactively
 * @public
 */

/**
 * A utility for creating tracked maps, copying the original data so that
 * mutations to the tracked data don't mutate the original untracked data.
 *
 * `trackedMap` can be used in templates and in JavaScript via import.
 * All property accesses entangle with that property, all property sets dirty
 * that property, and changes to the collection only render what changed
 * without causing unneeded renders.
 *
 * See [MDN for more information](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)
 *
 * @example
 * ```gjs
 * import { trackedMap } from '@ember/reactive';
 * import { on } from '@ember/modifier';
 * import { fn } from '@ember/helper';
 *
 * const nonTrackedMap = new Map();
 * nonTrackedMap.set('a', 1);
 * const addTo = (map) => map.set(Math.random(), Math.random());
 *
 * <template>
 *     {{#let (trackedMap nonTrackedMap) as |map|}}
 *         {{#each-in map as |key value|}}
 *             {{key}} => {{value}}<br>
 *         {{/each-in}}
 *
 *         <button {{on 'click' (fn addTo map)}}>Add Pair</button>
 *     {{/let}}
 * </template>
 * ```
 *
 * @method trackedMap
 * @static
 * @for @ember/reactive
 * @param {Map} [data] The initial Map data to track
 * @param {Object} [options] Optional configuration
 * @param {Function} [options.equals] Custom equality function (defaults to Object.is)
 * @param {String} [options.description] Description for debugging purposes
 * @returns {Map} A tracked Map that updates reactively
 * @public
 */

/**
 * A utility for creating tracked weak maps, copying the original data so that
 * mutations to the tracked data don't mutate the original untracked data.
 *
 * `trackedWeakMap` can be used in templates and in JavaScript via import.
 * All property accesses entangle with that property, all property sets dirty
 * that property, and changes to the collection only render what changed
 * without causing unneeded renders.
 *
 * WeakMaps hold weak references to their keys, allowing garbage collection
 * when key objects are no longer referenced elsewhere.
 *
 * See [MDN for more information](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)
 *
 * @example
 * ```gjs
 * import { trackedWeakMap } from '@ember/reactive';
 * import { on } from '@ember/modifier';
 * import { fn } from '@ember/helper';
 *
 * const nonTrackedWeakMap = new WeakMap();
 *
 * <template>
 *     {{#let (trackedWeakMap nonTrackedWeakMap) as |weakMap|}}
 *         {{log weakMap}}
 *     {{/let}}
 * </template>
 * ```
 *
 * @method trackedWeakMap
 * @static
 * @for @ember/reactive
 * @param {WeakMap} [data] The initial WeakMap data to track
 * @param {Object} [options] Optional configuration
 * @param {Function} [options.equals] Custom equality function (defaults to Object.is)
 * @param {String} [options.description] Description for debugging purposes
 * @returns {WeakMap} A tracked WeakMap that updates reactively
 * @public
 */
