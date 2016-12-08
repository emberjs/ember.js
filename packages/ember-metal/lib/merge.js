/**
  Merge the contents of two objects together into the first object.

  ```javascript
  Ember.merge({ first: 'Tom' }, { last: 'Dale' }); // { first: 'Tom', last: 'Dale' }
  var a = { first: 'Yehuda' };
  var b = { last: 'Katz' };
  Ember.merge(a, b); // a == { first: 'Yehuda', last: 'Katz' }, b == { last: 'Katz' }
  ```

  @method merge
  @for Ember
  @param {Object} original The object to merge into
  @param {Object} updates The object to copy properties from
  @return {Object}
  @public
*/
export default function merge(original, updates) {
  if (!updates || typeof updates !== 'object') {
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
