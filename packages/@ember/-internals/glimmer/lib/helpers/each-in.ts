/**
@module ember
*/
import { tagForObject } from '@ember/-internals/metal/lib/tags';
import { contentFor as _contentFor } from '@ember/-internals/runtime/lib/mixins/-proxy';
import { isProxy } from '@ember/-internals/utils/lib/is_proxy';
import { assert } from '@ember/debug';
import type { CapturedArguments } from '@glimmer/interfaces';
import { createComputeRef, valueForRef } from '@glimmer/reference/lib/reference';
import { consumeTag } from '@glimmer/validator/lib/tracking';
import { internalHelper } from './internal-helper';

/**
  The `{{#each}}` keyword loops over elements in a collection. It is an extension
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
    
  `#each` is a keyword and does not need to be imported. 

  ### Specifying Keys

  By default, Ember tracks each item in the array by its own object identity. When
  the array changes, Ember reuses the DOM for items it has seen before and only
  creates or removes DOM for items that were actually added or removed.

  Usually this is all you need. But sometimes an object's identity changes even
  though it still represents the same underlying data. A common cause is mapping
  over an array, which produces a brand-new object for every item on each render:

  ```javascript
  people.map((person) => {
    return { ...person, type: 'developer' };
  });
  ```

  Because every object is new, Ember can no longer match the items to the previous
  render by identity, so it recreates the DOM for the entire list.

  The `key` option tells Ember which property to use to match items across renders
  instead of identity:

  ```handlebars
  <ul>
    {{#each @developers key="name" as |person|}}
      <li>Hello, {{person.name}}!</li>
    {{/each}}
  </ul>
  ```

  Now, if Ember has previously rendered an item whose `name` matches one in the new
  array, it reuses that item's DOM elements instead of recreating them.

  There are two special values for `key`:

    * `@index` - The index of the item in the array.
    * `@identity` - The item in the array itself. This is the default.

  #### What `key` does (and does not) do

  `key` controls whether the **DOM elements** are reused. It does **not** prevent the
  block from re-rendering. When a matched item is a different object than before (as
  with `map` above), Ember still re-evaluates the block so any updated data is
  reflected — `{{person.name}}` is re-read, and any helpers or modifiers inside the
  block run again.

  What you gain by reusing the DOM elements is the preservation of state that lives on
  those elements but is not driven by your template, for example:

    * text a user has typed into an unbound `<input>`, including cursor position and selection
    * which element currently has focus
    * scroll position
    * the playback state of `<audio>` and `<video>` elements

  Without a stable `key`, replacing the array with freshly-mapped objects would destroy
  and recreate these elements, discarding that state. With `key`, the elements survive
  and keep their state across the update.

  ```handlebars
  <ul>
    {{#each @sounds key="id" as |sound|}}
      <li>
        {{sound.name}}
        <audio src={{sound.url}} controls />
      </li>
    {{/each}}
  </ul>
  ```

  Here, updating `@sounds` (even if it produces new objects) won't interrupt audio that
  is currently playing, because the `<audio>` elements are reused rather than recreated.

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
  The `{{#each-in}}` keyword loops over properties on an object.

  For example, given this component definition:

  ```app/components/developer-details.gjs
  import Component from '@glimmer/component';
  import { tracked } from '@glimmer/tracking';

  export default class extends Component {
    @tracked developer = {
      "name": "Shelly Sails",
      "age": 42
    };
    
    <template>
      <ul>
        {{#each-in this.developer as |key value|}}
          <li>{{key}}: {{value}}</li>
        {{/each-in}}
      </ul>
    </template>
  }
  ```

  This template would display all properties on the `developer`
  object in a list, outputting their name and age:

  ```html
  <ul>
    <li>name: Shelly Sails</li>
    <li>age: 42</li>
  </ul>
  ```
 
  `#each-in` is a keyword and does not need to be imported.

  @method each-in
  @for Ember.Templates.helpers
  @public
  @since 2.1.0
*/
export class EachInWrapper {
  constructor(public inner: unknown) {}
}

export default internalHelper(({ positional }: CapturedArguments) => {
  const inner = positional[0];
  assert('expected at least one positional arg', inner);

  return createComputeRef(() => {
    let iterable = valueForRef(inner);

    consumeTag(tagForObject(iterable));

    if (isProxy(iterable)) {
      // this is because the each-in doesn't actually get(proxy, 'key') but bypasses it
      // and the proxy's tag is lazy updated on access
      iterable = _contentFor(iterable);
    }

    return new EachInWrapper(iterable);
  });
});
