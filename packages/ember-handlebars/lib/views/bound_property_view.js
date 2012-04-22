// ==========================================================================
// Project:   Ember Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals Handlebars */

var getPath = Ember.getPath;

require('ember-views/views/view');
require('ember-handlebars/views/metamorph_view');

/**
  @ignore
  @private
  @class

  Ember._BoundPropertyView is a private view created by the Handlebars `{{bind}}`
  helper that is used to keep track of bound properties.
*/
Ember._BoundPropertyView = Ember.View.extend(Ember.Metamorph,
/** @scope Ember._BoundPropertyView.prototype */{

  context: null,
  property: null,

  propertyValue: function() {
    var value = getPath(this.context, this.property);
    if (this.isEscaped) { value = Handlebars.Utils.escapeExpression(value); }
    return value;
  },

  render: function(buffer) {
    buffer.push(this.propertyValue());
  },

  propertyDidChange: function() {
    if (this.morph.isRemoved()) { return; }
    this.morph.html(this.propertyValue());
  },

  didInsertElement: function() {
    this.propertyDidChange();
  },

  init: function() {
    this._super();
    Ember.addObserver(this.context, this.property, this, 'propertyDidChange');
  }

});
