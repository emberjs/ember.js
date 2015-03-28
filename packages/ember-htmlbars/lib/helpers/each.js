
/**
@module ember
@submodule ember-htmlbars
*/
import Ember from "ember-metal/core"; // Ember.assert;
import EachView from "ember-views/views/each";

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

  The same rules apply to arrays of primitives, but the items may need to be
  references with `{{this}}`.

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

  ```
  {{#each developers as |person|}}
    {{person.name}}
  {{else}}
    <p>Sorry, nobody is available for this task.</p>
  {{/each}}
  ```

  ### Specifying an alternative view for each item

  `itemViewClass` can control which view will be used during the render of each
  item's template.

  The following template:

  ```handlebars
  <ul>
  {{#each developers itemViewClass="person" as |developer|}}
    {{developer.name}}
  {{/each}}
  </ul>
  ```

  Will use the following view for each item

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
  must {{#crossLink "Ember.View/toc_templates"}}provide its own template{{/crossLink}},
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
    {{each developer in developers itemViewClass="person"}}
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
  Specifically, an {{#crossLink "Ember.ObjectController"}}Ember.ObjectController{{/crossLink}}
  should probably be used. Item controllers are passed the item they
  will present as a `model` property, and an object controller will
  proxy property lookups to `model` for us.

  This allows state and decoration to be added to the controller
  while any other property lookups are delegated to the model. An example:

  ```javascript
  App.RecruitController = Ember.ObjectController.extend({
    isAvailableForHire: function() {
      return !this.get('isEmployed') && this.get('isSeekingWork');
    }.property('isEmployed', 'isSeekingWork')
  })
  ```

  ```handlebars
  {{#each developers itemController="recruit" as |person|}}
    {{person.name}} {{#if person.isAvailableForHire}}Hire me!{{/if}}
  {{/each}}
  ```

  @method each
  @for Ember.Handlebars.helpers
  @param [path] {String} path
  @param [name] {String} name for item (used in block)
  @param [options] {Object} Handlebars key/value pairs of options
  @param [options.itemViewClass] {String} a path to a view class used for each item
  @param [options.emptyViewClass] {String} a path to a view class used for each item
  @param [options.itemController] {String} name of a controller to be created for each item
*/
function eachHelper(params, hash, options, env) {
  var view = env.data.view;
  var helperName = 'each';
  var path = params[0] || view.getStream('');

  Ember.assert(
    "The each helper only takes a single argument. Did you mean to use the " +
    "block syntax? (`{{#each foo as |bar|}}`)",
    params.length <= 1
  );

  var blockParams = options.template && options.template.blockParams;

  if (blockParams) {
    hash.keyword = true;
    hash.blockParams = blockParams;
  }

  Ember.deprecate(
    "Using the context switching form of {{each}} is deprecated. " +
    "Please use the block form (`{{#each foo as |bar|}}`) instead.",
    hash.keyword === true || typeof hash.keyword === 'string',
    { url: 'http://emberjs.com/guides/deprecations/#toc_more-consistent-handlebars-scope' }
  );

  hash.dataSource = path;
  options.helperName = options.helperName || helperName;

  return env.helpers.collection.helperFunction.call(this, [EachView], hash, options, env);
}

export {
  EachView,
  eachHelper
};
