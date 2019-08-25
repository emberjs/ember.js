/**
@module ember
*/
import { symbol } from '@ember/-internals/utils';
import { Tag, VersionedPathReference } from '@glimmer/reference';
import { Arguments, VM } from '@glimmer/runtime';
import { Opaque } from '@glimmer/util';

/**
  The `{{#each}}` helper loops over elements in a collection. It is an extension
  of the base Handlebars `{{#each}}` helper.
  The default behavior of `{{#each}}` is to yield its inner block once for every
  item in an array passing the item as the first block parameter.

  ```app/components/developer-listing.js
  import Component from '@glimmer/component';

  export default class DeveloperListingComponent extends Component {
    developers = [{ name: 'Yehuda' },{ name: 'Tom' }, { name: 'Paul' }];
  }
  ```

  ```app/components/developer-listing.hbs
  {{#each this.developers key="name" as |person|}}
    {{person.name}}
    {{! `this` is whatever it was outside the #each }}
  {{/each}}
  ```

  The same rules apply to arrays of primitives.

  ```app/components/developer-listing.js
  import Component from '@glimmer/component';

  export default class DeveloperListingComponent extends Component {
    developerNames = ['Yehuda', 'Tom', 'Paul']
  }
  ```

  ```app/components/developer-listing.hbs
  {{#each this.developerNames key="@index" as |name|}}
    {{name}}
  {{/each}}
  ```

  During iteration, the index of each item in the array is provided as a second block parameter.

  ```handlebars
  <ul>
    {{#each this.people as |person index|}}
      <li>Hello, {{person.name}}! You're number {{index}} in line</li>
    {{/each}}
  </ul>
  ```

  ### Specifying Keys

  The `key` option is used to tell Ember how to determine if the array being
  iterated over with `{{#each}}` has changed between renders. By helping Ember
  detect that some elements in the array are the same, DOM elements can be
  re-used, significantly improving rendering speed.

  For example, here's the `{{#each}}` helper with its `key` set to `id`:

  ```handlebars
  {{#each @model key="id" as |item|}}
    {{item}}
  {{/each}}
  ```

  When this `{{#each}}` re-renders, Ember will match up the previously rendered
  items (and reorder the generated DOM elements) based on each item's `id`
  property.
  By default the item's own reference is used.

  ### {{else}} condition

  `{{#each}}` can have a matching `{{else}}`. The contents of this block will render
  if the collection is empty.

  ```handlebars
  {{#each this.developers as |person|}}
    {{person.name}}
  {{else}}
    <p>Sorry, nobody is available for this task.</p>
  {{/each}}
  ```

  @method each
  @for Ember.Templates.helpers
  @public
 */

/**
  The `{{each-in}}` helper loops over properties on an object.

  For example, given a `user` object that looks like:

  ```app/components/developer-details.js
  import Component from '@glimmer/component';

  export default class DeveloperDetailsComponent extends Component {
    developer = {
      "name": "Shelly Sails",
      "age": 42
    };
  }
  ```

  This template would display all properties on the `user`
  object in a list:

  ```app/components/developer-details.hbs
  <ul>
  {{#each-in this.developer as |key value|}}
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

  value(): Opaque {
    return this.inner.value();
  }

  get(key: string): VersionedPathReference {
    return this.inner.get(key);
  }
}

export function isEachIn(ref: Opaque): ref is VersionedPathReference {
  return ref !== null && typeof ref === 'object' && ref[EACH_IN_REFERENCE];
}

export default function(_vm: VM, args: Arguments) {
  return new EachInReference(args.positional.at(0));
}
