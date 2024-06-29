import type Application from '@ember/application';

function initializeStore(application: Application) {
  application.registerOptionsForType('serializer', { singleton: false });
  application.registerOptionsForType('adapter', { singleton: false });
}

function setupContainer(application: Application) {
  initializeStore(application);
}

/*
  This code initializes EmberData in an Ember application.
*/
export default {
  name: 'ember-data',
  initialize: setupContainer,
};
