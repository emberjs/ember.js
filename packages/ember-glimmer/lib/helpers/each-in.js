import { symbol } from 'ember-utils';

/**
  The `{{each-in}}` helper loops over properties on an object.

  For example, given a `user` object that looks like:

  ```javascript
  {
    "name": "Shelly Sails",
    "age": 42
  }
  ```

  This template would display all properties on the `user`
  object in a list:

  ```handlebars
  <ul>
  {{#each-in user as |key value|}}
    <li>{{key}}: {{value}}</li>
  {{/each-in}}
  </ul>
  ```

  Outputting their name and age.

  @method each-in
  @for Ember.Templates.helpers
  @public
  @since 2.1.0
*/
const EACH_IN_REFERENCE = symbol('EACH_IN');

export function isEachIn(ref) {
  return ref && ref[EACH_IN_REFERENCE];
}

export default function(vm, args) {
  let ref = Object.create(args.positional.at(0));
  ref[EACH_IN_REFERENCE] = true;
  return ref;
}
