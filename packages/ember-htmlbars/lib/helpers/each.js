import { forEach } from "ember-metal/enumerable_utils";
import normalizeSelf from "ember-htmlbars/utils/normalize-self";
import shouldDisplay from "ember-views/streams/should_display";
import decodeEachKey from "ember-htmlbars/utils/decode-each-key";

/**
  The `{{#each}}` helper loops over elements in a collection. It is an extension
  of the base Handlebars `{{#each}}` helper.

  The default behavior of `{{#each}}` is to yield its inner block once for every
  item in an array.

  ```javascript
  var developers = [{name: 'Yehuda'},{name: 'Tom'}, {name: 'Paul'}];
  ```

  ```handlebars
  {{#each developers key="name" as |person|}}
    {{person.name}}
    {{! `this` is whatever it was outside the #each }}
  {{/each}}
  ```

  The same rules apply to arrays of primitives.

  ```javascript
  var developerNames = ['Yehuda', 'Tom', 'Paul']
  ```

  ```handlebars
  {{#each developerNames key="@index" as |name|}}
    {{name}}
  {{/each}}
  ```

  ### `key` param

  The `key` hash parameter provides much needed insight into how the rendering
  engine should determine if a given iteration of the loop matches a previous one.
  This is mostly apparent during re-rendering when the array being iterated may
  have changed (via sort, removal, addition, etc).

  For example, using the following:

  ```handlebars
  {{#each model key="id" as |item|}}
  {{/each}}
  ```

  Upon re-render, the rendering engine will match up the previously rendered items
  (and reorder the generated DOM elements) based on each item's `id` property.

  There are a few special values for `key`:

    * `@index` - The index of the item in the array.
    * `@item` - The item in the array itself.  This can only be used for arrays of strings
      or numbers.
    * `@guid` - Generate a unique identifier for each object (uses `Ember.guidFor`).

  ### {{else}} condition

  `{{#each}}` can have a matching `{{else}}`. The contents of this block will render
  if the collection is empty.

  ```handlebars
  {{#each developers as |person|}}
    {{person.name}}
  {{else}}
    <p>Sorry, nobody is available for this task.</p>
  {{/each}}
  ```

  @method each
  @for Ember.Handlebars.helpers
*/
export default function eachHelper(params, hash, blocks) {
  var list = params[0];
  var keyPath = hash.key;

  if (blocks.template.arity === 0) {
    Ember.deprecate(deprecation);
  }

  if (shouldDisplay(list)) {
    forEach(list, function(item, i) {
      var self;
      if (blocks.template.arity === 0) {
        self = normalizeSelf(item);
      }

      var key = decodeEachKey(item, keyPath, i);
      blocks.template.yieldItem(key, [item, i], self);
    });
  } else if (blocks.inverse.yield) {
    blocks.inverse.yield();
  }
}

export var deprecation = "Using the context switching form of {{each}} is deprecated. Please use the keyword form (`{{#each items as |item|}}`) instead.";
