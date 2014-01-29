var get = Ember.get,
    set = Ember.set;
var a_forEach = Ember.EnumerableUtils.forEach;
/**

  `bindableAttributes` are used to allow certain attributes to be bound based
  on whether they are present on the view at the time it is rendered. This means
  that we do not setup property observers for any properties that do not exist
  at the time the view is initially rendered.

  Unlike the standard `attributeBindings` no observers are setup for properties
  that do not initially exist.

  @class BindableAttributesMixin
  @namespace Ember
  @extends Ember.Mixin
  @private
*/
Ember.BindableAttributesMixin = Ember.Mixin.create({
  concatenatedProperties: ['bindableAttributes'],

  /**
    A list of the properties that will be setup as bound attributes
    if they are provided to the object at creation time.

    @property bindableAttributes
  */
  bindableAttributes: [],

  /**
    Used to keep track of the `bindableAttributes` that existed at the
    time of the first `render`.

    @property _appliedBindableAttributes
    @private
  */
  _appliedBindableAttributes: null,

  /**
    Used to determine the list of attributes to setup binding for based on
    `bindableAttributes`. Any property in `bindableAttributes` that
    exists on this instance will be added to `_appliedBindableAttributes`.

    Please note that this is only called upon the first render. This is so that
    we do not need to check every `bindableAttribute` on every render call.

    @method _setupBindableAttributes
    @private
  */
  _setupBindableAttributes: function(){
    var bindableAttributes = get(this, 'bindableAttributes');

    this._appliedBindableAttributes = [];

    a_forEach(bindableAttributes, function(binding) {
      var split = binding.split(':'),
          property = split[0],
          attributeName = split[1] || property;

      if (get(this, attributeName) !== undefined) {
        this._appliedBindableAttributes.push(binding);
      }
    }, this);
  },

  applyAttributesToBuffer: function(buffer) {
    this._super.apply(this, arguments);

    if (Ember.FEATURES.isEnabled('ember-views-bindable-attributes')) {
      if (this._appliedBindableAttributes === null) {
        this._setupBindableAttributes();
      }

      if (this._appliedBindableAttributes.length) {
        // setup bindings only if the properties exist
        this._applyAttributeBindings(buffer, this._appliedBindableAttributes, true);
      }
    }
  }
});
