require("ember-handlebars/ext");
require("ember-views/views/view");
require("ember-handlebars/controls/text_support");

/**
@module ember
@submodule ember-handlebars
*/

var get = Ember.get, set = Ember.set;

/**
  The `Ember.TextArea` view class renders a
  [textarea](https://developer.mozilla.org/en/HTML/Element/textarea) element.
  It allows for binding Ember properties to the text area contents (`value`),
  live-updating as the user inputs text:

  ```javascript
  App.ApplicationController = Ember.Controller.extend({
    writtenWords: 'hello'
  });
  ```

  ```handlebars
  {{view Ember.TextArea valueBinding="writtenWords"}}
  ```

  Would result in the following HTML:

  ```html
  <textarea class="ember-text-area">
    hello
  </textarea>
  ```

  You may also use the "dynamic tag" form of the helper, rather than the
  `{{view}}` form. In fact [this is recommend](/blog/2013/04/21/ember-1-0-rc3.html#toc_new-input-and-textarea-helpers).

  ```handlebars
  {{ textarea value=writtenWords }}
  ```

  When using dynamic tags, you do not need to use a `Binding` suffix and
  must leave out the quotation marks around the values. Ember will interpret
  quoted strings as static strings in this context. See the
  [Ember.Handlebars.helpers](/api/classes/Ember.Handlebars.helpers.html)'s
  section for more information.

  ## Layout and LayoutName properties

  Because HTML `textarea` elements do not contain inner HTML the `layout` and
  `layoutName` properties will not be applied. See [Ember.View](/api/classes/Ember.View.html)'s
  layout section for more information.

  ## HTML Attributes

  By default `Ember.TextArea` provides support for `rows`, `cols`,
  `placeholder`, `disabled`, `maxlength` and `tabindex` attributes on a
  textarea. If you need to support  more attributes have a look at the
  `attributeBindings` property in `Ember.View`'s HTML Attributes section.

  To globally add support for additional attributes you can reopen
  `Ember.TextArea` or `Ember.TextSupport`.

  ```javascript
  Ember.TextSupport.reopen({
    attributeBindings: ["required"]
  })
  ```

  @class TextArea
  @namespace Ember
  @extends Ember.View
  @uses Ember.TextSupport
*/
Ember.TextArea = Ember.View.extend(Ember.TextSupport, {
  classNames: ['ember-text-area'],

  tagName: "textarea",
  attributeBindings: ['rows', 'cols', 'name'],
  rows: null,
  cols: null,

  _updateElementValue: Ember.observer(function() {
    // We do this check so cursor position doesn't get affected in IE
    var value = get(this, 'value'),
        $el = this.$();
    if ($el && value !== $el.val()) {
      $el.val(value);
    }
  }, 'value'),

  init: function() {
    this._super();
    this.on("didInsertElement", this, this._updateElementValue);
  }

});
