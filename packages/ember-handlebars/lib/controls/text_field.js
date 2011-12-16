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
  @extends Ember.TextSupport
*/
Ember.TextField = Ember.View.extend(Ember.TextSupport,
  /** @scope Ember.TextField.prototype */ {

  classNames: ['ember-text-field'],

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
