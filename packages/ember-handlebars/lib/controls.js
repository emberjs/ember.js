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

  The `{{input}}` helper inserts an HTML `<input>` tag into the template,
  with a `type` value of either `text` or `checkbox`. If no `type` is provided,
  `text` will be the default value applied. The attributes of `{{input}}`
  match those of the native HTML tag as closely as possible for these two types.

  ## Use as text field
  An `{{input}}` with no `type` or a `type` of `text` will render an HTML text input.
  The following HTML attributes can be set via the helper:
    
    * `value`
    * `size`
    * `name`
    * `pattern`
    * `placeholder`
    * `disabled`
    * `maxlength`
    * `tabindex`

  When set to a quoted string, these values will be directly applied to the HTML
  element. When left unquoted, these values will be bound to a property on the
  template's current rendering context (most typically a controller instance).
  
  Unbound:

  ```handlebars
  {{input value="http://www.facebook.com"}}
  ```

  ```html
  <input type="text" value="http://www.facebook.com"/>
  ```

  Bound:

  ```javascript
  App.ApplicationController = Ember.Controller.extend({
    firstName: "Stanley",
    entryNotAllowed: true
  });
  ```
  
  ```handlebars
  {{input type="text" value=firstName disabled=entryNotAllowed size="50"}}
  ```

  ```html
  <input type="text" value="Stanley" disabled="disabled" size="50"/>
  ```
  
  ### Extension
  Internally, `{{input type="text"}}` creates an instance of `Ember.TextField`, passing
  arguments from the helper to `Ember.TextField`'s `create` method. You can extend the
  capablilties of text inputs in your applications by reopening this class. For example,
  if you are deploying to browsers where the `required` attribute is used, you
  can add this to the `TextField`'s `attributeBindings` property:

  ```javascript
  Ember.TextField.reopen({
    attributeBindings: ['required']
  });

  ## Use as checkbox
  An `{{input}}` with a `type` of `checkbox` will render an HTML checkbox input.
  The following HTML attributes can be set via the helper:
    
    * `checked`
    * `disabled`
    * `tabindex`
    * `indeterminate`
    * `name`

  When set to a quoted string, these values will be directly applied to the HTML
  element. When left unquoted, these values will be bound to a property on the
  template's current rendering context (most typically a controller instance).

  Unbound:

  ```handlebars
  {{input type="checkbox" name="isAdmin"}}
  ```

  ```html
  <input type="checkbox" name="isAdmin" />
  ```

  Bound:

  ```javascript
  App.ApplicationController = Ember.Controller.extend({
    isAdmin: true
  });
  ```

  ```handlebars
  {{input type="checkbox" checked=isAdmin }}
  ```

  ```html
  <input type="checkbox" checked="checked" />
  ```

  ### Extension
  Internally, `{{input type="checkbox"}}` creates an instance of `Ember.Checkbox`, passing
  arguments from the helper to `Ember.Checkbox`'s `create` method. You can extend the
  capablilties of checkbox inputs in your applications by reopening this class. For example,
  if you wanted to add a css class to all checkboxes in your application:

  ```javascript
  Ember.Checkbox.reopen({
    classNames: ['my-app-checkbox']
  });


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
