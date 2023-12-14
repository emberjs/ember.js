declare module '@ember/object/proxy' {
  /**
    @module @ember/object/proxy
    */
  import { FrameworkObject } from '@ember/object/-internals';
  import { _ProxyMixin } from '@ember/-internals/runtime';
  /**
      `ObjectProxy` forwards all properties not defined by the proxy itself
      to a proxied `content` object.

      ```javascript
      import EmberObject from '@ember/object';
      import ObjectProxy from '@ember/object/proxy';

      let exampleObject = EmberObject.create({
        name: 'Foo'
      });

      let exampleProxy = ObjectProxy.create({
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

      let exampleProxy = ObjectProxy.create({
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

      let exampleProxy = ProxyWithComputedProperty.create();

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
  interface ObjectProxy<Content = unknown> extends _ProxyMixin<Content> {
    get<K extends keyof Content>(keyName: K): Content[K];
    get<K extends keyof this>(keyname: K): this[K];
    get(keyName: string): unknown;
    set<K extends keyof Content>(keyName: K, value: Content[K]): Content[K];
    set<K extends keyof this>(keyName: K, value: this[K]): this[K];
    set(keyName: string): unknown;
    getProperties<K extends keyof Content | keyof this>(
      list: K[]
    ): Pick<Content, Exclude<K, keyof this>> & Pick<this, Exclude<K, keyof Content>>;
    getProperties<K extends keyof Content | keyof this>(
      ...list: K[]
    ): Pick<Content, Exclude<K, keyof this>> & Pick<this, Exclude<K, keyof Content>>;
    getProperties<K extends string>(list: K[]): Record<K, unknown>;
    getProperties<K extends string>(...list: K[]): Record<K, unknown>;
    setProperties<
      K extends keyof Content | keyof this,
      Hash extends Partial<
        Pick<Content, Exclude<K, keyof this>> & Pick<this, Exclude<K, keyof Content>>
      >
    >(
      hash: Hash
    ): Hash;
    setProperties<T extends Record<string, unknown>>(hash: T): T;
  }
  class ObjectProxy<Content = unknown> extends FrameworkObject {}
  export default ObjectProxy;
}
