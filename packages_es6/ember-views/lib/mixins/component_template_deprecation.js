import Ember from 'ember-metal/core'; // Ember.deprecate
import {get} from 'ember-metal/property_get';
import {Mixin} from 'ember-metal/mixin';
import {indexOf} from 'ember-metal/array';

/**
  The ComponentTemplateDeprecation mixin is used to provide a useful
  deprecation warning when using either `template` or `templateName` with
  a component. The `template` and `templateName` properties specified at
  extend time are moved to `layout` and `layoutName` respectively.

  `Ember.ComponentTemplateDeprecation` is used internally by Ember in
  `Ember.Component`.

  @class ComponentTemplateDeprecation
  @namespace Ember
*/
var ComponentTemplateDeprecation = Mixin.create({
  /**
    @private

    Moves `templateName` to `layoutName` and `template` to `layout` at extend
    time if a layout is not also specified.

    Note that this currently modifies the mixin themselves, which is technically
    dubious but is practically of little consequence. This may change in the
    future.

    @method willMergeMixin
    @since 1.4.0
  */
  willMergeMixin: function(props, without) {
    // must call _super here to ensure that the ActionHandler
    // mixin is setup properly (moves actions -> _actions)
    //
    // Calling super is only OK here since we KNOW that
    // there is another Mixin loaded first.
    this._super.apply(this, arguments);

    var deprecatedProperty, replacementProperty,
        layoutSpecified = (props.layoutName || props.layout || get(this, 'layoutName'));

    if (props.templateName && !layoutSpecified) {
      deprecatedProperty = 'templateName';
      replacementProperty = 'layoutName';
    }

    if (props.template && !layoutSpecified) {
      deprecatedProperty = 'template';
      replacementProperty = 'layout';
    }

    if (deprecatedProperty) {
      // If the mixin actually has a record not to include this property,
      // we don't need to complain because it won't be included.
      if (!without || indexOf.call(without, deprecatedProperty) === -1) {
        props[replacementProperty] = props[deprecatedProperty];
        delete props[deprecatedProperty];
        Ember.deprecate('Do not specify ' + deprecatedProperty + ' on a Component, use ' + replacementProperty + ' instead.', false);
      }
    }
  }
});

export default ComponentTemplateDeprecation;

