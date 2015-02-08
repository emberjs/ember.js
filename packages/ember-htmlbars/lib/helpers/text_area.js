/**
@module ember
@submodule ember-htmlbars
*/

import Ember from "ember-metal/core"; // Ember.assert
import TextArea from "ember-views/views/text_area";

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
    * `selectionEnd`
    * `selectionStart`
    * `selectionDirection`
    * `wrap`
    * `readonly`
    * `autofocus`
    * `form`
    * `spellcheck`
    * `required`

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

  ## Actions

  The helper can send multiple actions based on user events.

  The action property defines the action which is send when
  the user presses the return key.

  ```handlebars
  {{input action="submit"}}
  ```

  The helper allows some user events to send actions.

* `enter`
* `insert-newline`
* `escape-press`
* `focus-in`
* `focus-out`
* `key-press`

  For example, if you desire an action to be sent when the input is blurred,
  you only need to setup the action name to the event name property.

  ```handlebars
  {{textarea focus-in="alertMessage"}}
  ```

  See more about [Text Support Actions](/api/classes/Ember.TextArea.html)

  ## Extension

  Internally, `{{textarea}}` creates an instance of `Ember.TextArea`, passing
  arguments from the helper to `Ember.TextArea`'s `create` method. You can
  extend the capabilities of text areas in your application by reopening this
  class. For example, if you are building a Bootstrap project where `data-*`
  attributes are used, you can globally add support for a `data-*` attribute
  on all `{{textarea}}`s' in your app by reopening `Ember.TextArea` or
  `Ember.TextSupport` and adding it to the `attributeBindings` concatenated
  property:

  ```javascript
  Ember.TextArea.reopen({
    attributeBindings: ['data-error']
  });
  ```

  Keep in mind when writing `Ember.TextArea` subclasses that `Ember.TextArea`
  itself extends `Ember.Component`, meaning that it does NOT inherit
  the `controller` of the parent view.

  See more about [Ember components](/api/classes/Ember.Component.html)

  @method textarea
  @for Ember.Handlebars.helpers
  @param {Hash} options
*/
export function textareaHelper(params, hash, options, env) {
  Ember.assert('You can only pass attributes to the `textarea` helper, not arguments', params.length === 0);

  return env.helpers.view.helperFunction.call(this, [TextArea], hash, options, env);
}
