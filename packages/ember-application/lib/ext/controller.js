/**
@module ember
@submodule ember-application
@public
*/

import Ember from 'ember-metal/core'; // Ember.assert
import { get } from 'ember-metal/property_get';
import ControllerMixin from 'ember-runtime/mixins/controller';
import controllerFor from 'ember-routing/system/controller_for';

/**
  @class ControllerMixin
  @namespace Ember
  @public
*/
ControllerMixin.reopen({
  /**
    @method controllerFor
    @see {Ember.Route#controllerFor}
    @deprecated Use `Ember.inject.controller()` instead.
    @public
  */
  controllerFor(controllerName) {
    Ember.deprecate('Controller#controllerFor is deprecated, please use Ember.inject.controller() instead');
    return controllerFor(get(this, 'container'), controllerName);
  }
});

export default ControllerMixin;
