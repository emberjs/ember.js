
/**
@module ember
@submodule ember-handlebars
*/
import Ember from "ember-metal/core"; // Ember.assert;

import EmberHandlebars from "ember-handlebars-compiler";
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
  {{#each person in developers}}
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
  {{#each name in developerNames}}
    {{name}}
  {{/each}}
  ```

  ### {{else}} condition

  `{{#each}}` can have a matching `{{else}}`. The contents of this block will render
  if the collection is empty.

  ```
  {{#each person in developers}}
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
  {{#each developer in developers itemViewClass="person"}}
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
  {{#each developer in developers emptyViewClass="no-people"}}
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
  {{#each person in developers itemController="recruit"}}
    {{person.name}} {{#if person.isAvailableForHire}}Hire me!{{/if}}
  {{/each}}
  ```

  @method each
  @for Ember.Handlebars.helpers
  @param [name] {String} name for item (used with `in`)
  @param [path] {String} path
  @param [options] {Object} Handlebars key/value pairs of options
  @param [options.itemViewClass] {String} a path to a view class used for each item
  @param [options.emptyViewClass] {String} a path to a view class used for each item
  @param [options.itemController] {String} name of a controller to be created for each item
*/
function eachHelper(path) {
  var options = arguments[arguments.length - 1];
  var helperName = 'each';
  var keywordName;

  if (arguments.length === 4) {
    Ember.assert("If you pass more than one argument to the each helper," +
                 " it must be in the form #each foo in bar", arguments[1] === "in");

    keywordName = arguments[0];
    path = arguments[2];

    helperName += ' ' + keywordName + ' in ' + path;

    options.hash.keyword = keywordName;
  } else if (arguments.length === 1) {
    path = '';
  } else {
    helperName += ' ' + path;
  }

  Ember.deprecate('Using the context switching form of {{each}} is deprecated. Please use the keyword form (`{{#each foo in bar}}`) instead. See http://emberjs.com/guides/deprecations/#toc_more-consistent-handlebars-scope for more details.', keywordName);

  options.hash.emptyViewClass = Ember._MetamorphView;
  options.hash.dataSourceBinding = path;
  options.hashTypes.dataSourceBinding = 'STRING';
  options.helperName = options.helperName || helperName;

  return EmberHandlebars.helpers.collection.call(this, EmberHandlebars.EachView, options);
}

export {
  EachView,
  eachHelper
};
