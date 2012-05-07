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
Ember.TextArea = Ember.View.extend(Ember.TextSupport,
/** @scope Ember.TextArea.prototype */ {

  classNames: ['ember-text-area'],

  tagName: "textarea",
  attributeBindings: ['rows', 'cols'],
  rows: null,
  cols: null,

  _updateElementValue: Ember.observer(function() {
    this.$().val(get(this, 'value'));
  }, 'value'),

  init: function() {
    this._super();
    this.on("didInsertElement", this, this._updateElementValue);
  }

});
