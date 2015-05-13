import { get } from "ember-metal/property_get";
import { forEach } from "ember-metal/enumerable_utils";
import normalizeSelf from "ember-htmlbars/utils/normalize-self";

/**
  The `{{#each}}` helper loops over elements in a collection. It is an extension
  of the base Handlebars `{{#each}}` helper.

  The default behavior of `{{#each}}` is to yield its inner block once for every
  item in an array.

  ```javascript
  var developers = [{name: 'Yehuda'},{name: 'Tom'}, {name: 'Paul'}];
  ```

  ```handlebars
  {{#each developers as |person|}}
    {{person.name}}
    {{! `this` is whatever it was outside the #each }}
  {{/each}}
  ```

  The same rules apply to arrays of primitives.

  ```javascript
  var developerNames = ['Yehuda', 'Tom', 'Paul']
  ```

  ```handlebars
  {{#each developerNames as |name|}}
    {{name}}
  {{/each}}
  ```

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

  ### Specifying an alternative view for each item

  `itemViewClass` can control which view will be used during the render of each
  item's template. The following template:

  ```handlebars
  <ul>
    {{#each developers itemViewClass="person" as |developer|}}
      {{developer.name}}
    {{/each}}
  </ul>
  ```

  Will use the following view for each item:

  ```javascript
  App.PersonView = Ember.View.extend({
    tagName: 'li'
  });
  ```

  Resulting in HTML output that looks like the following:

  ```html
  <ul>
    <li class="ember-view">Yehuda</li>
    <li class="ember-view">Tom</li>
    <li class="ember-view">Paul</li>
  </ul>
  ```

  `itemViewClass` also enables a non-block form of `{{each}}`. The view
  must [provide its own template](/api/classes/Ember.View.html#toc_templates)
  and then the block should be dropped. An example that outputs the same HTML
  as the previous one:

  ```javascript
  App.PersonView = Ember.View.extend({
    tagName: 'li',
    template: '{{developer.name}}'
  });
  ```

  ```handlebars
  <ul>
    {{each developers itemViewClass="person" as |developer|}}
  </ul>
  ```

  ### Specifying an alternative view for no items (else)

  The `emptyViewClass` option provides the same flexibility to the `{{else}}`
  case of the each helper.

  ```javascript
  App.NoPeopleView = Ember.View.extend({
    tagName: 'li',
    template: 'No person is available, sorry'
  });
  ```

  ```handlebars
  <ul>
    {{#each developers emptyViewClass="no-people" as |developer|}}
      <li>{{developer.name}}</li>
    {{/each}}
  </ul>
  ```

  ### Wrapping each item in a controller

  Controllers in Ember manage state and decorate data. In many cases,
  providing a controller for each item in a list can be useful.
  An item that is passed to an item controller will be set as the `model` property
  on the controller.

  This allows state and decoration to be added to the controller
  while any other property lookups can be delegated to the model. An example:

  ```javascript
  App.RecruitController = Ember.Controller.extend({
    isAvailableForHire: function() {
      return !this.get('model.isEmployed') && this.get('model.isSeekingWork');
    }.property('model.isEmployed', 'model.isSeekingWork')
  })
  ```

  ```handlebars
  {{#each developers itemController="recruit" as |person|}}
    {{person.model.name}} {{#if person.isAvailableForHire}}Hire me!{{/if}}
  {{/each}}
  ```

  @method each
  @for Ember.Handlebars.helpers
  @param [name] {String} name for item (used with `as`)
  @param [path] {String} path
  @param [options] {Object} Handlebars key/value pairs of options
  @param [options.itemViewClass] {String} a path to a view class used for each item
  @param [options.emptyViewClass] {String} a path to a view class used for each item
  @param [options.itemController] {String} name of a controller to be created for each item
*/
export default function eachHelper(params, hash, blocks) {
  var list = params[0];
  var keyPath = hash.key;

  // TODO: Correct falsy semantics
  if (!list || get(list, 'length') === 0) {
    if (blocks.inverse.yield) { blocks.inverse.yield(); }
    return;
  }

  forEach(list, function(item, i) {
    var self;
    if (blocks.template.arity === 0) {
      Ember.deprecate(deprecation);
      self = normalizeSelf(item);
    }

    var key = keyPath ? get(item, keyPath) : String(i);
    blocks.template.yieldItem(key, [item, i], self);
  });
}

export var deprecation = "Using the context switching form of {{each}} is deprecated. Please use the keyword form (`{{#each items as |item|}}`) instead.";
