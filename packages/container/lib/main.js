import Ember from 'ember-metal/core';

/*
Public api for the container is still in flux.
The public api, specified on the application namespace should be considered the stable api.
// @module container
  @private
*/

/*
 Flag to enable/disable model factory injections (disabled by default)
 If model factory injections are enabled, models should not be
 accessed globally (only through `container.lookupFactory('model:modelName'))`);
*/
Ember.MODEL_FACTORY_INJECTIONS = false;

if (Ember.ENV && typeof Ember.ENV.MODEL_FACTORY_INJECTIONS !== 'undefined') {
  Ember.MODEL_FACTORY_INJECTIONS = !!Ember.ENV.MODEL_FACTORY_INJECTIONS;
}

import Registry from 'container/registry';
import Container from 'container/container';

export { Registry, Container };
