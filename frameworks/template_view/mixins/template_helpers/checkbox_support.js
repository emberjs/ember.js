// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/template');

/** @class */

SC.Checkbox = SC.TemplateView.extend(
  /** @scope SC.Checkbox.prototype */ {

  title: null,
  value: null,

  displayTitle: function() {
    var title = this.get('title');
    return title ? SC.String.loc(title) : null;
  }.property('title').cacheable(),

  classNames: ['sc-checkbox'],
  template: SC.Handlebars.compile('<label><input type="checkbox">{{displayTitle}}</label>'),

  didCreateLayer: function() {
    var self = this;

    this.$('input').bind('change', function() {
      self.domValueDidChange(this);
    });
  },

  domValueDidChange: function(node) {
    this.set('value', $(node).prop('checked'));
  },

  value: function(key, value) {
    if (value !== undefined) {
      this.$('input').prop('checked', value);
    } else {
      value = this.$('input').prop('checked');
    }

    return value;
  }.property()
});

SC.CheckboxSupport = /** @scope SC.CheckboxSupport */{
  didCreateLayer: function() {
    this.$('input').change(jQuery.proxy(function() {
      SC.RunLoop.begin();
      this.notifyPropertyChange('value');
      SC.RunLoop.end();
    }, this));
  },

  value: function(key, value) {
    if (value !== undefined) {
      this.$('input').prop('checked', value);
    } else {
      value = this.$('input').prop('checked');
    }

    return value;
  }.property().idempotent()
};

