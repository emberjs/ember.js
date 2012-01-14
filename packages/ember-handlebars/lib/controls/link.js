// ==========================================================================
// Project:   Ember Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

Ember.Link = Ember.View.extend(Ember.TargetActionSupport, {
  classNames:        ['ember-link'],
  tagName:           'a',
  attributeBindings: ['href'],
  href:              '#',
  target:            'parentView',
  propagateEvents:   false,

  click: function(evt) {
    evt.preventDefault();

    // Invoke the link's target and action.
    this.triggerAction();

    return Ember.get(this, 'propagateEvents');
  }
});
