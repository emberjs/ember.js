require("ember-handlebars/controls/checkbox");
require("ember-handlebars/controls/text_field");
require("ember-handlebars/controls/text_area");
require("ember-handlebars/controls/select");

/**
@module ember
@submodule ember-handlebars-compiler
*/

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

  ## Unbound:

  ```handlebars
  {{input value="http://www.facebook.com"}}
  ```


  ```html
  <input type="text" value="http://www.facebook.com"/>
  ```

  ## Bound:

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

  ## Extension

  Internally, `{{input type="text"}}` creates an instance of `Ember.TextField`, passing
  arguments from the helper to `Ember.TextField`'s `create` method. You can extend the
  capablilties of text inputs in your applications by reopening this class. For example,
  if you are deploying to browsers where the `required` attribute is used, you
  can add this to the `TextField`'s `attributeBindings` property:


  ```javascript
  Ember.TextField.reopen({
    attributeBindings: ['required']
  });
  ```

  Keep in mind when writing `Ember.TextField` subclasses that `Ember.TextField`
  itself extends `Ember.Component`, meaning that it does NOT inherit
  the `controller` of the parent view.

  See more about [Ember components](api/classes/Ember.Component.html)


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

  ## Unbound:

  ```handlebars
  {{input type="checkbox" name="isAdmin"}}
  ```

  ```html
  <input type="checkbox" name="isAdmin" />
  ```

  ## Bound:

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

  ## Extension

  Internally, `{{input type="checkbox"}}` creates an instance of `Ember.Checkbox`, passing
  arguments from the helper to `Ember.Checkbox`'s `create` method. You can extend the
  capablilties of checkbox inputs in your applications by reopening this class. For example,
  if you wanted to add a css class to all checkboxes in your application:


  ```javascript
  Ember.Checkbox.reopen({
    classNames: ['my-app-checkbox']
  });
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

  if (inputType === 'checkbox') {
    return Ember.Handlebars.helpers.view.call(this, Ember.Checkbox, options);
  } else {
    if (inputType) { hash.type = inputType; }
    hash.onEvent = onEvent || 'enter';
    return Ember.Handlebars.helpers.view.call(this, Ember.TextField, options);
  }
});

/**
  `{{textarea}}` inserts a new instance of `<textarea>` tag into the template.
  The attributes of `{{textarea}}` match those of the native HTML tags as
  closely as possible.

  The following HTML attributes can be set:

    * `value`
    * `name`
    * `rows`
    * `cols`
    * `placeholder`
    * `disabled`
    * `maxlength`
    * `tabindex`

  When set to a quoted string, these value will be directly applied to the HTML
  element. When left unquoted, these values will be bound to a property on the
  template's current rendering context (most typically a controller instance).

  Unbound:

  ```handlebars
  {{textarea value="Lots of static text that ISN'T bound"}}
  ```

  Would result in the following HTML:

  ```html
  <textarea class="ember-text-area">
    Lots of static text that ISN'T bound
  </textarea>
  ```

  Bound:

  In the following example, the `writtenWords` property on `App.ApplicationController`
  will be updated live as the user types 'Lots of text that IS bound' into
  the text area of their browser's window.

  ```javascript
  App.ApplicationController = Ember.Controller.extend({
    writtenWords: "Lots of text that IS bound"
  });
  ```

  ```handlebars
  {{textarea value=writtenWords}}
  ```

   Would result in the following HTML:

  ```html
  <textarea class="ember-text-area">
    Lots of text that IS bound
  </textarea>
  ```

  If you wanted a one way binding between the text area and a div tag
  somewhere else on your screen, you could use `Ember.computed.oneWay`:

  ```javascript
  App.ApplicationController = Ember.Controller.extend({
    writtenWords: "Lots of text that IS bound",
    outputWrittenWords: Ember.computed.oneWay("writtenWords")
  });
  ```

  ```handlebars
  {{textarea value=writtenWords}}

  <div>
    {{outputWrittenWords}}
  </div>
  ```

  Would result in the following HTML:

  ```html
  <textarea class="ember-text-area">
    Lots of text that IS bound
  </textarea>

  <-- the following div will be updated in real time as you type -->

  <div>
    Lots of text that IS bound
  </div>
  ```

  Finally, this example really shows the power and ease of Ember when two
  properties are bound to eachother via `Ember.computed.alias`. Type into
  either text area box and they'll both stay in sync. Note that
  `Ember.computed.alias` costs more in terms of performance, so only use it when
  your really binding in both directions:

  ```javascript
  App.ApplicationController = Ember.Controller.extend({
    writtenWords: "Lots of text that IS bound",
    twoWayWrittenWords: Ember.computed.alias("writtenWords")
  });
  ```

  ```handlebars
  {{textarea value=writtenWords}}
  {{textarea value=twoWayWrittenWords}}
  ```

  ```html
  <textarea id="ember1" class="ember-text-area">
    Lots of text that IS bound
  </textarea>

  <-- both updated in real time -->

  <textarea id="ember2" class="ember-text-area">
    Lots of text that IS bound
  </textarea>
  ```

  ## Extension

  Internally, `{{textarea}}` creates an instance of `Ember.TextArea`, passing
  arguments from the helper to `Ember.TextArea`'s `create` method. You can
  extend the capabilities of text areas in your application by reopening this
  class. For example, if you are deploying to browsers where the `required`
  attribute is used, you can globally add support for the `required` attribute
  on all `{{textarea}}`s' in your app by reopening `Ember.TextArea` or
  `Ember.TextSupport` and adding it to the `attributeBindings` concatenated
  property:

  ```javascript
  Ember.TextArea.reopen({
    attributeBindings: ['required']
  });
  ```

  Keep in mind when writing `Ember.TextArea` subclasses that `Ember.TextArea`
  itself extends `Ember.Component`, meaning that it does NOT inherit
  the `controller` of the parent view.

  See more about [Ember components](api/classes/Ember.Component.html)

  @method textarea
  @for Ember.Handlebars.helpers
  @param {Hash} options
*/
Ember.Handlebars.registerHelper('textarea', function(options) {
  Ember.assert('You can only pass attributes to the `textarea` helper, not arguments', arguments.length < 2);

  var hash = options.hash,
      types = options.hashTypes;

  return Ember.Handlebars.helpers.view.call(this, Ember.TextArea, options);
});
