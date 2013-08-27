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

  `TextField`, `TextArea` and `Checkbox` views have corresponding
  handlebars helpers.

  ```handlebars
    {{view Ember.TextField valueBinding="name"}}
    {{view Ember.Checkbox  checkedBinding="isActive"}}
    {{view Ember.TextArea  valueBinding="name"}}
  ```

  can now also expressed as:

  ```handlebars
    {{input value=name}}
    {{input type=checkbox checked=isActive}}
    {{textarea value=name}}
  ```

  We recommend using the "dynamic tag" forms rather than the `{{view}}` forms because
  they are equivalent to the static tags that we all know and love.

  Note that when using dynamic tags, you do not need to use a `Binding` suffix and
  must leave out the quotation marks around the values. Ember will interpret quoted
  strings as static strings in this context.

  `{{input}}` inserts a new instance of either `Ember.TextField` or
  `Ember.Checkbox`, depending on the `type` option passed in. If no `type`
  is supplied it defaults to Ember.TextField.

  ```javascript
  App.ApplicationController = Ember.Controller.extend({
    firstName: "Stanley"
  });
  ```

  ```handlebars
  {{input value=firstName}}
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
    writtenWords: "hello"
  });
  ```

  ```handlebars
  {{ textarea value=writtenWords }}
  ```

  ```html
  <textarea class="ember-text-area">
    hello
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
