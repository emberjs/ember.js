
/**
@module ember
@submodule ember-handlebars
*/
import {get} from "ember-metal/property_get";
import Component from "ember-views/views/component";
import TextSupport from "ember-handlebars/controls/text_support";
import {observer} from "ember-metal/mixin";

/**
  The internal class used to create textarea element when the `{{textarea}}`
  helper is used.

  See [handlebars.helpers.textarea](/api/classes/Ember.Handlebars.helpers.html#method_textarea)  for usage details.

  ## Layout and LayoutName properties

  Because HTML `textarea` elements do not contain inner HTML the `layout` and
  `layoutName` properties will not be applied. See [Ember.View](/api/classes/Ember.View.html)'s
  layout section for more information.

  @class TextArea
  @namespace Ember
  @extends Ember.Component
  @uses Ember.TextSupport
*/
var TextArea = Component.extend(TextSupport, {
  classNames: ['ember-text-area'],

  tagName: "textarea",
  attributeBindings: ['rows', 'cols', 'name', 'selectionEnd', 'selectionStart', 'wrap'],
  rows: null,
  cols: null,

  _updateElementValue: observer('value', function() {
    // We do this check so cursor position doesn't get affected in IE
    var value = get(this, 'value'),
        $el = this.$();
    if ($el && value !== $el.val()) {
      $el.val(value);
    }
  }),

  init: function() {
    this._super();
    this.on("didInsertElement", this, this._updateElementValue);
  }

});

export default TextArea;
