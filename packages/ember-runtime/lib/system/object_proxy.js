import FrameworkObject from './object';
import _ProxyMixin from '../mixins/-proxy';

/**
  `Ember.ObjectProxy` forwards all properties not defined by the proxy itself
  to a proxied `content` object.

  ```javascript
  object = Ember.Object.create({
    name: 'Foo'
  });

  proxy = Ember.ObjectProxy.create({
    content: object
  });

  // Access and change existing properties
  proxy.get('name')          // 'Foo'
  proxy.set('name', 'Bar');
  object.get('name')         // 'Bar'

  // Create new 'description' property on `object`
  proxy.set('description', 'Foo is a whizboo baz');
  object.get('description')  // 'Foo is a whizboo baz'
  ```

  While `content` is unset, setting a property to be delegated will throw an
  Error.

  ```javascript
  proxy = Ember.ObjectProxy.create({
    content: null,
    flag: null
  });
  proxy.set('flag', true);
  proxy.get('flag');         // true
  proxy.get('foo');          // undefined
  proxy.set('foo', 'data');  // throws Error
  ```

  Delegated properties can be bound to and will change when content is updated.

  Computed properties on the proxy itself can depend on delegated properties.

  ```javascript
  ProxyWithComputedProperty = Ember.ObjectProxy.extend({
    fullName: Ember.computed('firstName', 'lastName', function() {
      var firstName = this.get('firstName'),
          lastName = this.get('lastName');
      if (firstName && lastName) {
        return firstName + ' ' + lastName;
      }
      return firstName || lastName;
    })
  });

  proxy = ProxyWithComputedProperty.create();

  proxy.get('fullName');  // undefined
  proxy.set('content', {
    firstName: 'Tom', lastName: 'Dale'
  }); // triggers property change for fullName on proxy

  proxy.get('fullName');  // 'Tom Dale'
  ```

  @class ObjectProxy
  @namespace Ember
  @extends Ember.Object
  @extends Ember._ProxyMixin
  @public
*/

export default FrameworkObject.extend(_ProxyMixin);
