/**
@module @ember/component
*/
import { TextSupport } from '@ember/-internals/views';
import Component from '../component';
import layout from '../templates/empty';

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
    * `autocomplete`
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

  In the following example, the `writtenWords` property on the application
  Controller will be updated live as the user types 'Lots of text that IS
  bound' into the text area of their browser's window.

  ```app/controllers/application.js
  import Controller from '@ember/controller';

  export default Controller.extend({
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
  somewhere else on your screen, you could use `oneWay`:

  ```app/controllers/application.js
  import Controller from '@ember/controller';
  import { oneWay } from '@ember/object/computed';

  export default Controller.extend({
    writtenWords: "Lots of text that IS bound",

    outputWrittenWords: oneWay("writtenWords")
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
  properties are bound to eachother via `alias`. Type into
  either text area box and they'll both stay in sync. Note that
  `alias` costs more in terms of performance, so only use it when
  your really binding in both directions:

  ```app/controllers/application.js
  import Controller from '@ember/controller';
  import { alias } from '@ember/object/computed';

  export default Controller.extend({
    writtenWords: "Lots of text that IS bound",

    twoWayWrittenWords: alias("writtenWords")
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

  ### Actions

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
  {{textarea focus-out="alertMessage"}}
  ```

  See more about [Text Support Actions](/api/ember/release/classes/TextArea)

  ### Extension

  Internally, `{{textarea}}` creates an instance of `TextArea`, passing
  arguments from the helper to `TextArea`'s `create` method. You can
  extend the capabilities of text areas in your application by reopening this
  class. For example, if you are building a Bootstrap project where `data-*`
  attributes are used, you can globally add support for a `data-*` attribute
  on all `{{textarea}}`s' in your app by reopening `TextArea` or
  `TextSupport` and adding it to the `attributeBindings` concatenated
  property:

  ```javascript
  import TextArea from '@ember/component/text-area';

  TextArea.reopen({
    attributeBindings: ['data-error']
  });
  ```

  Keep in mind when writing `TextArea` subclasses that `TextArea`
  itself extends `Component`. Expect isolated component semantics, not
  legacy 1.x view semantics (like `controller` being present).

  See more about [Ember components](/api/ember/release/classes/Component)

  @method textarea
  @for Ember.Templates.helpers
  @param {Hash} options
  @public
*/

/**
  The internal class used to create textarea element when the `{{textarea}}`
  helper is used.

  See [Ember.Templates.helpers.textarea](/api/ember/release/classes/Ember.Templates.helpers/methods/textarea?anchor=textarea)  for usage details.

  ## Layout and LayoutName properties

  Because HTML `textarea` elements do not contain inner HTML the `layout` and
  `layoutName` properties will not be applied.

  @class TextArea
  @extends Component
  @uses Ember.TextSupport
  @public
*/
const TextArea = Component.extend(TextSupport, {
  classNames: ['ember-text-area'],

  layout,

  tagName: 'textarea',
  attributeBindings: [
    'rows',
    'cols',
    'name',
    'selectionEnd',
    'selectionStart',
    'autocomplete',
    'wrap',
    'lang',
    'dir',
    'value',
  ],
  rows: null,
  cols: null,
});

TextArea.toString = () => '@ember/component/text-area';

export default TextArea;
