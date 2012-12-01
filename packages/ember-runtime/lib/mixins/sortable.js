require('ember-runtime/mixins/arrangable');

/**

  Deprecated. See `Ember.ArrangableMixin`.

  @class SortableMixin
  @namespace Ember
  @extends Ember.ArrangableMixin
*/

Ember.SortableMixin = Ember.Mixin.create(Ember.ArrangeableMixin, {
  init: function() {
    Ember.deprecate("Ember.SortableMixin has been replaced by Ember.ArrangeableMixin.");
    this._super();
  }
});
