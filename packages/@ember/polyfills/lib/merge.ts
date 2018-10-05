import { deprecate } from '@ember/debug';

/**
 @module @ember/polyfills
*/

export default function merge<T, U>(original: T, updates: U): T & U;

/**
  Merge the contents of two objects together into the first object.

  ```javascript
  import { merge } from '@ember/polyfills';

  merge({ first: 'Tom' }, { last: 'Dale' }); // { first: 'Tom', last: 'Dale' }
  var a = { first: 'Yehuda' };
  var b = { last: 'Katz' };
  merge(a, b); // a == { first: 'Yehuda', last: 'Katz' }, b == { last: 'Katz' }
  ```

  @method merge
  @static
  @for @ember/polyfills
  @param {Object} original The object to merge into
  @param {Object} updates The object to copy properties from
  @return {Object}
  @public
*/
export default function merge(original: object, updates: object) {
  deprecate('Use of `merge` has been deprecated. Please use `assign` instead.', false, {
    id: 'ember-polyfills.deprecate-merge',
    until: '4.0.0',
    url: 'https://emberjs.com/deprecations/v3.x/#toc_ember-polyfills-deprecate-merge',
  });

  if (updates === null || typeof updates !== 'object') {
    return original;
  }

  let props = Object.keys(updates);
  let prop;

  for (let i = 0; i < props.length; i++) {
    prop = props[i];
    original[prop] = updates[prop];
  }

  return original;
}
