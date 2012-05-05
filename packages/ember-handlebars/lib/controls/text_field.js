// ==========================================================================
// Project:   Ember Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require("ember-handlebars/ext");
require("ember-views/views/view");
require("ember-handlebars/controls/text_support");

var get = Ember.get, set = Ember.set;

/**
  @class

  The `Ember.TextField` view class renders a text
  [input](https://developer.mozilla.org/en/HTML/Element/Input) element. It
  allows for binding Ember properties to the text field contents (`value`),
  live-updating as the user inputs text.

  Example:

      {{view Ember.TextField valueBinding="firstName"}}

  @extends Ember.TextSupport
*/
Ember.TextField = Ember.View.extend(Ember.TextSupport,
  /** @scope Ember.TextField.prototype */ {

  classNames: ['ember-text-field'],
  tagName: "input",
  attributeBindings: ['type', 'value', 'size'],

  /**
    The value attribute of the input element. As the user inputs text, this
    property is updated live.

    @type String
    @default ""
  */
  value: "",

  /**
    The type attribute of the input element.

    @type String
    @default "text"
  */
  type: "text",

  /**
    The size of the text field in characters.

    @type String
    @default null
  */
  size: null
});
