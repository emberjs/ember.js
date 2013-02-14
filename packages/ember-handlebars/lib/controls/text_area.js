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
  live-updating as the user inputs text.

  ## Layout and LayoutName properties

  Because HTML `textarea` elements do not contain inner HTML the `layout` and
  `layoutName` properties will not be applied. See `Ember.View`'s layout
  section for more information.

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
  attributeBindings: ['rows', 'cols'],
  rows: null,
  cols: null
});
