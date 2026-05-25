/**
@module @ember/object/proxy
*/

import { get, set } from '@ember/-internals/metal';
import { meta } from '@ember/-internals/meta/lib/meta';
import { tagForObject } from '@ember/-internals/metal/lib/tags';
import { defineProperty } from '@ember/-internals/metal/lib/properties';
import { FrameworkObject } from '@ember/object/-internals';
import computed from '@ember/-internals/metal/lib/computed';
import { setProxy } from '@ember/-internals/utils/lib/is_proxy';
import { setCustomTagFor } from '@glimmer/manager/lib/util/args-proxy';
import {
  ContentProxy,
  contentFor,
  customTagForProxy,
} from '@ember/-internals/runtime/lib/proxy-utils';
import { assert } from '@ember/debug';

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

  class ProxyWithComputedProperty extends ObjectProxy {
    @computed('firstName', 'lastName')
    get fullName() {
      var firstName = this.get('firstName'),
          lastName = this.get('lastName');
      if (firstName && lastName) {
        return firstName + ' ' + lastName;
      }
      return firstName || lastName;
    }
  }

  let exampleProxy = ProxyWithComputedProperty.create();

  exampleProxy.get('fullName');  // undefined
  exampleProxy.set('content', {
    firstName: 'Tom', lastName: 'Dale'
  }); // triggers property change for fullName on proxy

  exampleProxy.get('fullName');  // 'Tom Dale'
  ```

  @class ObjectProxy
  @extends EmberObject
  @public
*/
interface ObjectProxy<Content = unknown> extends ContentProxy<Content> {
  isTruthy: boolean;

  unknownProperty<K extends keyof Content>(key: K): Content[K] | undefined;
  unknownProperty(key: string): unknown;

  setUnknownProperty<K extends keyof Content>(key: K, value: Content[K]): Content[K];
  setUnknownProperty<V>(key: string, value: V): V;

  // Proxies forward to their content via `unknownProperty` and
  // `setUnknownProperty`. The type overloads here merge Content and `this`
  // so callers get the correct result type.
  get<K extends keyof Content>(keyName: K): Content[K];
  get<K extends keyof this>(keyname: K): this[K];
  get(keyName: string): unknown;

  set<K extends keyof Content>(keyName: K, value: Content[K]): Content[K];
  set<K extends keyof this>(keyName: K, value: this[K]): this[K];
  set(keyName: string): unknown;

  // These types for `getProperties` and `setProperties` properly merge the
  // Content and `this` type for the proxy so callers actually get the safe
  // result.
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
    >,
  >(
    hash: Hash
  ): Hash;
  setProperties<T extends Record<string, unknown>>(hash: T): T;
}

class ObjectProxy<Content = unknown> extends FrameworkObject {
  content: unknown = null;

  init(...args: unknown[]) {
    super.init(...args);
    setProxy(this);
    tagForObject(this);
    setCustomTagFor(this, customTagForProxy);
  }

  willDestroy() {
    this.set('content', null);
    super.willDestroy();
  }

  @computed('content')
  get isTruthy(): boolean {
    return Boolean(get(this, 'content'));
  }

  unknownProperty(key: string): unknown {
    let content = contentFor(this);
    return content ? get(content, key) : undefined;
  }

  setUnknownProperty(key: string, value: unknown): unknown {
    let m = meta(this);

    if (m.isInitializing() || m.isPrototypeMeta(this)) {
      defineProperty(this, key, null, value);
      return value;
    }

    let content = contentFor(this);

    assert(
      `Cannot delegate set('${key}', ${value}) to the 'content' property of object proxy ${this}: its 'content' is undefined.`,
      content
    );

    // SAFETY: We don't actually guarantee that this is an object, so this isn't necessarily safe :(
    return set(content as object, key, value);
  }
}

export default ObjectProxy;
