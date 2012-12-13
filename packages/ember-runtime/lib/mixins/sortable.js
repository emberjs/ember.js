require('ember-runtime/mixins/arrangeable');

/**

  Deprecated. See `Ember.ArrangeableMixin`.

  @class SortableMixin
  @namespace Ember
  @extends Ember.ArrangeableMixin
*/

Ember.SortableMixin = Ember.Mixin.create(Ember.ArrangeableMixin, {
  init: function() {
    Ember.deprecate("Ember.SortableMixin has been replaced by Ember.ArrangeableMixin.");
    this._super();
  }
});
