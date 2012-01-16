// ==========================================================================
// Project:   Ember Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require("ember-views/views/view");
require("ember-handlebars/ext");

var set = Ember.set, get = Ember.get;

Ember.RadioButton = Ember.View.extend({
  title: null,
  checked: false,
  group: "radio_button",
  disabled: false,

  classNames: ['ember-radio-button'],

  defaultTemplate: Ember.Handlebars.compile('<label><input type="radio" {{bindAttr disabled="disabled" name="group" value="val" checked="checked"}}>{{title}}</label>'),

  change: function() {
    Ember.run.once(this, this._updateElementValue);
  },

  _updateElementValue: function() {
    var input = this.$('input:radio');
    set(this, 'value', input.attr('value'));
  }
});