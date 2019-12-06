import FrameworkObject from './object';
import _ProxyMixin from '../mixins/-proxy';

/**
  `ObjectProxy` forwards all properties not defined by the proxy itself
  to a proxied `content` object.

  ```javascript
  import EmberObject from '@ember/object';
  import ObjectProxy from '@ember/object/proxy';

  const exampleObject = EmberObject.create({
    name: 'Foo'
  });

  const exampleProxy = ObjectProxy.create({
    content: exampleObject
  });

  // Access and change existing properties
  exampleProxy.get('name');          // 'Foo'
  exampleProxy.set('name', 'Bar');
  exampleObject.get('name');         // 'Bar'

  // Create new 'description' property on `exampleObject`
  exampleProxy.set('description', 'Foo is a whizboo baz');
  exampleObject.get('description');  // 'Foo is a whizboo baz'
  ```

  While `content` is unset, setting a property to be delegated will throw an
  Error.

  ```javascript
  import ObjectProxy from '@ember/object/proxy';

  const exampleProxy = ObjectProxy.create({
    content: null,
    flag: null
  });
  exampleProxy.set('flag', true);
  exampleProxy.get('flag');         // true
  exampleProxy.get('foo');          // undefined
  exampleProxy.set('foo', 'data');  // throws Error
  ```

  Delegated properties can be bound to and will change when content is updated.

  Computed properties on the proxy itself can depend on delegated properties.

  ```javascript
  import { computed } from '@ember/object';
  import ObjectProxy from '@ember/object/proxy';

  ProxyWithComputedProperty = ObjectProxy.extend({
    fullName: computed('firstName', 'lastName', function() {
      var firstName = this.get('firstName'),
          lastName = this.get('lastName');
      if (firstName && lastName) {
        return firstName + ' ' + lastName;
      }
      return firstName || lastName;
    })
  });

  const exampleProxy = ProxyWithComputedProperty.create();

  exampleProxy.get('fullName');  // undefined
  exampleProxy.set('content', {
    firstName: 'Tom', lastName: 'Dale'
  }); // triggers property change for fullName on proxy

  exampleProxy.get('fullName');  // 'Tom Dale'
  ```

  @class ObjectProxy
  @extends EmberObject
  @uses Ember.ProxyMixin
  @public
*/
export default class ObjectProxy extends FrameworkObject {}
ObjectProxy.PrototypeMixin.reopen(_ProxyMixin);
