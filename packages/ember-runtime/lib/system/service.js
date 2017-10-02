import EmberObject from './object';
import { createInjectionHelper } from '../inject';


/**
  Creates a property that lazily looks up a service in the container. There
  are no restrictions as to what objects a service can be injected into.

  Example:

  ```app/routes/application.js
  import Route from '@ember/routing/route';
  import { inject as service } from '@ember/service';

  export default Route.extend({
    authManager: service('auth'),

    model() {
      return this.get('authManager').findCurrentUser();
    }
  });
  ```

  This example will create an `authManager` property on the application route
  that looks up the `auth` service in the container, making it easily
  accessible in the `model` hook.

  @method service
  @since 1.10.0
  @for Ember.inject
  @param {String} name (optional) name of the service to inject, defaults to
         the property's name
  @return {Ember.InjectedProperty} injection descriptor instance
  @public
*/
createInjectionHelper('service');

/**
  @class Service
  @namespace Ember
  @extends Ember.Object
  @since 1.10.0
  @public
*/
const Service = EmberObject.extend();

Service.reopenClass({
  isServiceFactory: true
});

export default Service;
