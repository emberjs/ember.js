/**
  Copy properties from a source object to a target object.

  ```javascript
  var a = { first: 'Yehuda' };
  var b = { last: 'Katz' };
  var c = { company: 'Tilde Inc.' };
  Ember.assign(a, b, c); // a === { first: 'Yehuda', last: 'Katz', company: 'Tilde Inc.' }, b === { last: 'Katz' }, c === { company: 'Tilde Inc.' }
  ```

  @method assign
  @for Ember
  @param {Object} original The object to assign into
  @param {Object} ...args The objects to copy properties from
  @return {Object}
  @public
*/
export default function assign(original) {
  for (let i = 1; i < arguments.length; i++) {
    let arg = arguments[i];
    if (!arg) { continue; }

    let updates = Object.keys(arg);

    for (let i = 0; i < updates.length; i++) {
      let prop = updates[i];
      original[prop] = arg[prop];
    }
  }

  return original;
}
