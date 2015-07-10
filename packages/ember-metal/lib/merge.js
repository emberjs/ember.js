/**
  Merge the contents of two objects together into the first object.

  ```javascript
  Ember.merge({first: 'Tom'}, {last: 'Dale'}); // {first: 'Tom', last: 'Dale'}
  var a = {first: 'Yehuda'};
  var b = {last: 'Katz'};
  Ember.merge(a, b); // a == {first: 'Yehuda', last: 'Katz'}, b == {last: 'Katz'}
  ```

  @method merge
  @for Ember
  @param {Object} original The object to merge into
  @param {Object} updates The object to copy properties from
  @return {Object}
  @private
*/
export default function merge(original, updates) {
  if (!updates || typeof updates !== 'object') {
    return original;
  }

  var props = Object.keys(updates);
  var prop;
  var length = props.length;

  for (var i = 0; i < length; i++) {
    prop = props[i];
    original[prop] = updates[prop];
  }

  return original;
}

export function assign(original, ...args) {
  for (let i = 0, l = args.length; i<l; i++) {
    let arg = args[i];
    if (!arg) { continue; }

    let updates = Object.keys(arg);

    for (let i = 0, l = updates.length; i<l; i++) {
      let prop = updates[i];
      original[prop] = arg[prop];
    }
  }

  return original;
}
