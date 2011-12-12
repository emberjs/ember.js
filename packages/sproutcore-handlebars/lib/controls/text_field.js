// ==========================================================================
// Project:   SproutCore Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require("sproutcore-handlebars/ext");
require("sproutcore-views/views/view");
require("sproutcore-handlebars/controls/text_support");
/** @class */

var get = Ember.get, set = Ember.set;

Ember.TextField = Ember.View.extend(Ember.TextSupport,
  /** @scope Ember.TextField.prototype */ {

  classNames: ['sc-text-field'],

  tagName: "input",
  attributeBindings: ['type', 'value'],
  type: "text",

  /**
    @private
  */
  _updateElementValue: function() {
    this.$().val(get(this, 'value'));
  }

});
