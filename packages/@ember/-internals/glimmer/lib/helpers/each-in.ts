/**
@module ember
*/
import { symbol } from '@ember/-internals/utils';
import { Tag, VersionedPathReference } from '@glimmer/reference';
import { Arguments, VM } from '@glimmer/runtime';

/**
  The `{{#each}}` helper loops over elements in a collection. It is an extension
  of the base Handlebars `{{#each}}` helper.

  The default behavior of `{{#each}}` is to yield its inner block once for every
  item in an array passing the item as the first block parameter.

  Assuming the `@developers` argument contains this array:

  ```javascript
  [{ name: 'Yehuda' },{ name: 'Tom' }, { name: 'Paul' }];
  ```

  ```handlebars
  <ul>
    {{#each @developers as |person|}}
      <li>Hello, {{person.name}}!</li>
    {{/each}}
  </ul>
  ```

  The same rules apply to arrays of primitives.

  ```javascript
  ['Yehuda', 'Tom', 'Paul']
  ```

  ```handlebars
  <ul>
    {{#each @developerNames as |name|}}
      <li>Hello, {{name}}!</li>
    {{/each}}
  </ul>
  ```

  During iteration, the index of each item in the array is provided as a second block
  parameter.

  ```handlebars
  <ul>
    {{#each @developers as |person index|}}
      <li>Hello, {{person.name}}! You're number {{index}} in line</li>
    {{/each}}
  </ul>
  ```

  ### Specifying Keys

  In order to improve rendering speed, Ember will try to reuse the DOM elements
  where possible. Specifically, if the same item is present in the array both
  before and after the change, its DOM output will be reused.

  The `key` option is used to tell Ember how to determine if the items in the
  array being iterated over with `{{#each}}` has changed between renders. By
  default the item's object identity is used.

  This is usually sufficient, so in most cases, the `key` option is simply not
  needed. However, in some rare cases, the objects' identities may change even
  though they represent the same underlying data.

  For example:

  ```javascript
  people.map(person => {
    return { ...person, type: 'developer' };
  });
  ```

  In this case, each time the `people` array is `map`-ed over, it will produce
  an new array with completely different objects between renders. In these cases,
  you can help Ember determine how these objects related to each other with the
  `key` option:

  ```handlebars
  <ul>
    {{#each @developers key="name" as |person|}}
      <li>Hello, {{person.name}}!</li>
    {{/each}}
  </ul>
  ```

  By doing so, Ember will use the value of the property specified (`person.name`
  in the example) to find a "match" from the previous render. That is, if Ember
  has previously seen an object from the `@developers` array with a matching
  name, its DOM elements will be re-used.

  ### {{else}} condition

  `{{#each}}` can have a matching `{{else}}`. The contents of this block will render
  if the collection is empty.

  ```handlebars
  <ul>
    {{#each @developers as |person|}}
      <li>{{person.name}} is available!</li>
    {{else}}
      <li>Sorry, nobody is available for this task.</li>
    {{/each}}
  </ul>
  ```

  @method each
  @for Ember.Templates.helpers
  @public
 */

/**
  The `{{each-in}}` helper loops over properties on an object.

  For example, if the `@user` argument contains this object:

  ```javascript
  {
    "name": "Shelly Sails",
    "age": 42
  }
  ```

  This template would display all properties on the `@user`
  object in a list:

  ```handlebars
  <ul>
  {{#each-in @user as |key value|}}
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

class EachInReference implements VersionedPathReference {
  public tag: Tag;

  constructor(private inner: VersionedPathReference) {
    this.tag = inner.tag;
    this[EACH_IN_REFERENCE] = true;
  }

  value(): unknown {
    return this.inner.value();
  }

  get(key: string): VersionedPathReference {
    return this.inner.get(key);
  }
}

export function isEachIn(ref: unknown): ref is VersionedPathReference {
  return ref !== null && typeof ref === 'object' && ref[EACH_IN_REFERENCE];
}

export default function(_vm: VM, args: Arguments) {
  return new EachInReference(args.positional.at(0));
}
