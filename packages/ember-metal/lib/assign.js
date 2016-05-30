/**
  Copy properties from a source object to a target object.

  ```javascript
  var a = {first: 'Yehuda'};
  var b = {last: 'Katz'};
  var c = {company: 'Tilde Inc.'};
  Ember.assign(a, b, c); // a === {first: 'Yehuda', last: 'Katz', company: 'Tilde Inc.'}, b === {last: 'Katz'}, c === {company: 'Tilde Inc.'}
  ```

  @method assign
  @for Ember
  @param {Object} original The object to assign into
  @param {Object} ...args The objects to copy properties from
  @return {Object}
  @public
*/
export default function assign(original, ...args) {
  for (let i = 0; i < args.length; i++) {
    let arg = args[i];
    if (!arg) { continue; }

    let updates = Object.keys(arg);

    for (let k = 0; k < updates.length; k++) {
      let prop = updates[k];
      original[prop] = arg[prop];
    }
  }

  return original;
}
