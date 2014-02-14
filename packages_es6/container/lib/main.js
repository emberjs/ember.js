/**
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
Ember.MODEL_FACTORY_INJECTIONS = false || !!Ember.ENV.MODEL_FACTORY_INJECTIONS;

import Container from 'container/container';

export default Container;
