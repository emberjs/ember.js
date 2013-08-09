require("ember-handlebars/controls/checkbox");
require("ember-handlebars/controls/text_field");
require("ember-handlebars/controls/button");
require("ember-handlebars/controls/text_area");
require("ember-handlebars/controls/select");

/**
@module ember
@submodule ember-handlebars
*/

function normalizeHash(hash, hashTypes) {
  for (var prop in hash) {
    if (hashTypes[prop] === 'ID') {
      hash[prop + 'Binding'] = hash[prop];
      delete hash[prop];
    }
  }
}

/**
  `{{input}}` inserts a new instance of either `Ember.TextField` or
  `Ember.Checkbox`, depending on the `type` option passed in. If no `type`
  is supplied it defaults to Ember.TextField.
  
  ```javascript
  App.ApplicationController = Ember.Controller.extend({
    firstName: "Stanley"
  });
  ```

  ```handlebars
  {{input value="firstName"}}
  ```
  
  ```html
  <input type="textfield" class="ember-text-field" value="Stanley" />
  ```

  @method input
  @for Ember.Handlebars.helpers
  @param {Hash} options
*/
Ember.Handlebars.registerHelper('input', function(options) {
  Ember.assert('You can only pass attributes to the `input` helper, not arguments', arguments.length < 2);

  var hash = options.hash,
      types = options.hashTypes,
      inputType = hash.type,
      onEvent = hash.on;

  delete hash.type;
  delete hash.on;

  normalizeHash(hash, types);

  if (inputType === 'checkbox') {
    return Ember.Handlebars.helpers.view.call(this, Ember.Checkbox, options);
  } else {
    if (inputType) { hash.type = inputType; }
    hash.onEvent = onEvent || 'enter';
    return Ember.Handlebars.helpers.view.call(this, Ember.TextField, options);
  }
});

/**
  `{{textarea}}` inserts a new instance of `Ember.TextArea` into the template.
  
  ```javascript
  App.ApplicationController = Ember.Controller.extend({
    writtenWords: "lorem ipsum dolor sit amet"
  });
  ```

  ```handlebars
  {{textarea value="writtenWords"}}
  ```
  
  ```html
  <textarea class="ember-text-area"> 
    written words
  </textarea>
  ```

  @method textarea
  @for Ember.Handlebars.helpers
  @param {Hash} options
*/
Ember.Handlebars.registerHelper('textarea', function(options) {
  Ember.assert('You can only pass attributes to the `textarea` helper, not arguments', arguments.length < 2);

  var hash = options.hash,
      types = options.hashTypes;

  normalizeHash(hash, types);
  return Ember.Handlebars.helpers.view.call(this, Ember.TextArea, options);
});
