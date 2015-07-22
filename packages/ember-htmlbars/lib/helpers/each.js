import shouldDisplay from 'ember-views/streams/should_display';
import decodeEachKey from 'ember-htmlbars/utils/decode-each-key';

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

  ### Specifying Keys

  The `key` option is used to tell Ember how to determine if the array being
  iterated over with `{{#each}}` has changed between renders. By helping Ember
  detect that some elements in the array are the same, DOM elements can be
  re-used, significantly improving rendering speed.

  For example, here's the `{{#each}}` helper with its `key` set to `id`:

  ```handlebars
  {{#each model key="id" as |item|}}
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
  {{#each developers as |person|}}
    {{person.name}}
  {{else}}
    <p>Sorry, nobody is available for this task.</p>
  {{/each}}
  ```

  @method each
  @for Ember.Templates.helpers
  @public
*/
export default function eachHelper(params, hash, blocks) {
  var list = params[0];
  var keyPath = hash.key;

  if (shouldDisplay(list)) {
    forEach(list, (item, i) => {
      var key = decodeEachKey(item, keyPath, i);

      blocks.template.yieldItem(key, [item, i]);
    });
  } else if (blocks.inverse.yield) {
    blocks.inverse.yield();
  }
}

function forEach(iterable, cb) {
  return iterable.forEach ? iterable.forEach(cb) : Array.prototype.forEach.call(iterable, cb);
}
