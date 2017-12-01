/**
@module ember
*/

import {
  Mixin
} from 'ember-metal';
import { deprecate } from 'ember-debug';

/**
  RegistryProxyMixin is used to provide public access to specific
  registry functionality.

  @class RegistryProxyMixin
  @private
*/
export default Mixin.create({
  __registry__: null,

  /**
   Given a fullName return the corresponding factory.

   @public
   @method resolveRegistration
   @param {String} fullName
   @return {Function} fullName's factory
   */
  resolveRegistration: registryAlias('resolve'),

  /**
    Registers a factory that can be used for dependency injection (with
    `inject`) or for service lookup. Each factory is registered with
    a full name including two parts: `type:name`.

    A simple example:

    ```javascript
    let App = Ember.Application.create();

    App.Orange = Ember.Object.extend();
    App.register('fruit:favorite', App.Orange);
    ```

    Ember will resolve factories from the `App` namespace automatically.
    For example `App.CarsController` will be discovered and returned if
    an application requests `controller:cars`.

    An example of registering a controller with a non-standard name:

    ```javascript
    let App = Ember.Application.create();
    let Session = Ember.Controller.extend();

    App.register('controller:session', Session);

    // The Session controller can now be treated like a normal controller,
    // despite its non-standard name.
    App.ApplicationController = Ember.Controller.extend({
      needs: ['session']
    });
    ```

    Registered factories are **instantiated** by having `create`
    called on them. Additionally they are **singletons**, each time
    they are looked up they return the same instance.

    Some examples modifying that default behavior:

    ```javascript
    let App = Ember.Application.create();

    App.Person = Ember.Object.extend();
    App.Orange = Ember.Object.extend();
    App.Email = Ember.Object.extend();
    App.session = Ember.Object.create();

    App.register('model:user', App.Person, { singleton: false });
    App.register('fruit:favorite', App.Orange);
    App.register('communication:main', App.Email, { singleton: false });
    App.register('session', App.session, { instantiate: false });
    ```

    @method register
    @param  fullName {String} type:name (e.g., 'model:user')
    @param  factory {Function} (e.g., App.Person)
    @param  options {Object} (optional) disable instantiation or singleton usage
    @public
   */
  register: registryAlias('register'),

  /**
   Unregister a factory.

   ```javascript
   let App = Ember.Application.create();
   let User = Ember.Object.extend();
   App.register('model:user', User);

   App.resolveRegistration('model:user').create() instanceof User //=> true

   App.unregister('model:user')
   App.resolveRegistration('model:user') === undefined //=> true
   ```

   @public
   @method unregister
   @param {String} fullName
   */
  unregister: registryAlias('unregister'),

  /**
   Check if a factory is registered.

   @public
   @method hasRegistration
   @param {String} fullName
   @return {Boolean}
   */
  hasRegistration: registryAlias('has'),

  /**
   Return a specific registered option for a particular factory.

   @public
   @method registeredOption
   @param  {String} fullName
   @param  {String} optionName
   @return {Object} options
   */
  registeredOption: registryAlias('getOption'),

  /**
   Register options for a particular factory.

   @public
   @method registerOptions
   @param {String} fullName
   @param {Object} options
   */
  registerOptions: registryAlias('options'),

  /**
   Return registered options for a particular factory.

   @public
   @method registeredOptions
   @param  {String} fullName
   @return {Object} options
   */
  registeredOptions: registryAlias('getOptions'),

  /**
   Allow registering options for all factories of a type.

   ```javascript
   let App = Ember.Application.create();
   let appInstance = App.buildInstance();

   // if all of type `connection` must not be singletons
   appInstance.registerOptionsForType('connection', { singleton: false });

   appInstance.register('connection:twitter', TwitterConnection);
   appInstance.register('connection:facebook', FacebookConnection);

   let twitter = appInstance.lookup('connection:twitter');
   let twitter2 = appInstance.lookup('connection:twitter');

   twitter === twitter2; // => false

   let facebook = appInstance.lookup('connection:facebook');
   let facebook2 = appInstance.lookup('connection:facebook');

   facebook === facebook2; // => false
   ```

   @public
   @method registerOptionsForType
   @param {String} type
   @param {Object} options
   */
  registerOptionsForType: registryAlias('optionsForType'),

  /**
   Return the registered options for all factories of a type.

   @public
   @method registeredOptionsForType
   @param {String} type
   @return {Object} options
   */
  registeredOptionsForType: registryAlias('getOptionsForType'),

  /**
    Define a dependency injection onto a specific factory or all factories
    of a type.

    When Ember instantiates a controller, view, or other framework component
    it can attach a dependency to that component. This is often used to
    provide services to a set of framework components.

    An example of providing a session object to all controllers:

    ```javascript
    let App = Ember.Application.create();
    let Session = Ember.Object.extend({ isAuthenticated: false });

    // A factory must be registered before it can be injected
    App.register('session:main', Session);

    // Inject 'session:main' onto all factories of the type 'controller'
    // with the name 'session'
    App.inject('controller', 'session', 'session:main');

    App.IndexController = Ember.Controller.extend({
      isLoggedIn: Ember.computed.alias('session.isAuthenticated')
    });
    ```

    Injections can also be performed on specific factories.

    ```javascript
    App.inject(<full_name or type>, <property name>, <full_name>)
    App.inject('route', 'source', 'source:main')
    App.inject('route:application', 'email', 'model:email')
    ```

    It is important to note that injections can only be performed on
    classes that are instantiated by Ember itself. Instantiating a class
    directly (via `create` or `new`) bypasses the dependency injection
    system.

    @public
    @method inject
    @param  factoryNameOrType {String}
    @param  property {String}
    @param  injectionName {String}
  **/
  inject: registryAlias('injection')
});

function registryAlias(name) {
  return function () {
    return this.__registry__[name](...arguments);
  };
}
