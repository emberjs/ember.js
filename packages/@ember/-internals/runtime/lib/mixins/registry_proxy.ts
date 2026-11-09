/**
@module ember
*/

import type Registry from '@ember/-internals/container/lib/registry';
import type { RegistryProxy } from '@ember/-internals/owner';

import { DeprecatedMixin } from '@ember/object/mixin-internal';
import { deprecateUntil, DEPRECATIONS } from '@ember/-internals/deprecations';
import InternalRegistryProxyMixin from '@ember/-internals/runtime/lib/mixins/registry_proxy-internal';

/**
  RegistryProxyMixin is used to provide public access to specific
  registry functionality.

  @class RegistryProxyMixin
  @private
  @deprecated Use the owner API from `@ember/owner` instead. See https://deprecations.emberjs.com/id/deprecate-registry-proxy-mixin.
*/

/* The following documentation is duplicated to properly show deprecated on
   the instances on the RegistryProxyMixin
 */

/**
 Registers a factory that can be used for dependency injection (with
 `inject`) or for service lookup. Each factory is registered with
 a full name including two parts: `type:name`.

 A simple example:

 ```javascript
 import Application from '@ember/application';
 import EmberObject from '@ember/object';

 let App = Application.create();

 App.Orange = EmberObject.extend();
 App.register('fruit:favorite', App.Orange);
 ```

 Ember will resolve factories from the `App` namespace automatically.
 For example `App.CarsController` will be discovered and returned if
 an application requests `controller:cars`.

 An example of registering a controller with a non-standard name:

 ```javascript
 import Application from '@ember/application';
 import Controller from '@ember/controller';

 let App = Application.create();
 let Session = Controller.extend();

 App.register('controller:session', Session);

 // The Session controller can now be treated like a normal controller,
 // despite its non-standard name.
 App.ApplicationController = Controller.extend({
 needs: ['session']
 });
 ```

 Registered factories are **instantiated** by having `create`
 called on them. Additionally they are **singletons**, each time
 they are looked up they return the same instance.

 Some examples modifying that default behavior:

 ```javascript
 import Application from '@ember/application';
 import EmberObject from '@ember/object';

 let App = Application.create();

 App.Person = EmberObject.extend();
 App.Orange = EmberObject.extend();
 App.Email = EmberObject.extend();
 App.session = EmberObject.create();

 App.register('model:user', App.Person, { singleton: false });
 App.register('fruit:favorite', App.Orange);
 App.register('communication:main', App.Email, { singleton: false });
 App.register('session', App.session, { instantiate: false });
 ```

 @method register
 @param  fullName {String} type:name (e.g., 'model:user')
 @param  factory {Factory|object} (e.g., App.Person)
 @param  options {Object} (optional) disable instantiation or singleton usage
 @public
 @deprecated Use the owner API from `@ember/owner` instead. See https://deprecations.emberjs.com/id/deprecate-registry-proxy-mixin.
 */

interface RegistryProxyMixin extends RegistryProxy {
  /** @internal */
  __registry__: Registry;
}
const RegistryProxyMixin = DeprecatedMixin.create(InternalRegistryProxyMixin, {
  init() {
    this._super(...arguments);
    deprecateUntil(
      'The `RegistryProxyMixin` mixin is deprecated. Use the owner API from `@ember/owner` instead.',
      DEPRECATIONS.DEPRECATE_REGISTRY_PROXY_MIXIN
    );
  },
});

export default RegistryProxyMixin;
