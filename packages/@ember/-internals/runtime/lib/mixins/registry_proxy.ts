/**
@module ember
*/

import { type Registry } from '@ember/-internals/container';
import { type RegistryProxy } from '@ember/-internals/owner';
import { type AnyFn } from '@ember/-internals/utility-types';

import { assert } from '@ember/debug';
import Mixin from '@ember/object/mixin';

/**
  RegistryProxyMixin is used to provide public access to specific
  registry functionality.

  @class RegistryProxyMixin
  @extends RegistryProxy
  @private
*/
interface RegistryProxyMixin extends RegistryProxy {
  /** @internal */
  __registry__: Registry;
}
const RegistryProxyMixin = Mixin.create({
  __registry__: null,

  resolveRegistration(fullName: string) {
    assert('fullName must be a proper full name', this.__registry__.isValidFullName(fullName));
    return this.__registry__.resolve(fullName);
  },

  register: registryAlias('register'),
  unregister: registryAlias('unregister'),
  hasRegistration: registryAlias('has'),
  registeredOption: registryAlias('getOption'),
  registerOptions: registryAlias('options'),
  registeredOptions: registryAlias('getOptions'),
  registerOptionsForType: registryAlias('optionsForType'),
  registeredOptionsForType: registryAlias('getOptionsForType'),

  /**
    Define a dependency injection onto a specific factory or all factories
    of a type.

    When Ember instantiates a controller, view, or other framework component
    it can attach a dependency to that component. This is often used to
    provide services to a set of framework components.

    An example of providing a session object to all controllers:

    ```javascript
    import { alias } from '@ember/object/computed';
    import Application from '@ember/application';
    import Controller from '@ember/controller';
    import EmberObject from '@ember/object';

    let App = Application.create();
    let Session = EmberObject.extend({ isAuthenticated: false });

    // A factory must be registered before it can be injected
    App.register('session:main', Session);

    // Inject 'session:main' onto all factories of the type 'controller'
    // with the name 'session'
    App.inject('controller', 'session', 'session:main');

    App.IndexController = Controller.extend({
      isLoggedIn: alias('session.isAuthenticated')
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
    @deprecated
  **/
  inject: registryAlias('injection'),
});

type AliasMethods =
  | 'register'
  | 'unregister'
  | 'has'
  | 'getOption'
  | 'options'
  | 'getOptions'
  | 'optionsForType'
  | 'getOptionsForType'
  | 'injection';

function registryAlias<N extends AliasMethods>(name: N) {
  return function (this: RegistryProxyMixin, ...args: Parameters<Registry[N]>) {
    // We need this cast because `Parameters` is deferred so that it is not
    // possible for TS to see it will always produce the right type. However,
    // since `AnyFn` has a rest type, it is allowed. See discussion on [this
    // issue](https://github.com/microsoft/TypeScript/issues/47615).
    return (this.__registry__[name] as AnyFn)(...args);
  };
}

export default RegistryProxyMixin;
