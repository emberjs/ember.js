import { CUSTOM_TAG_FOR } from '@ember/-internals/metal';
import { HAS_NATIVE_PROXY } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import { CapturedNamedArguments, Dict, VMArguments } from '@glimmer/interfaces';
import { createConstRef, Reference, valueForRef } from '@glimmer/reference';

import { Tag, track } from '@glimmer/validator';
/**
@module ember
*/

function tagForKey(named: CapturedNamedArguments, key: string): Tag {
  return track(() => {
    let ref = named[key];

    if (ref !== undefined) {
      valueForRef(ref);
    }
  });
}

let hashProxyFor: (args: CapturedNamedArguments) => Record<string, unknown>;

class HashProxy implements ProxyHandler<Record<string, unknown>> {
  private customTagFor: (obj: object, key: string) => Tag;

  constructor(private named: CapturedNamedArguments) {
    this.customTagFor = (_obj: object, key: string) => tagForKey(named, key);
  }

  get(target: Record<string, unknown>, prop: string | number, receiver: unknown) {
    if (prop === CUSTOM_TAG_FOR) {
      return this.customTagFor;
    }

    const ref = this.named[prop as string];

    if (ref !== undefined) {
      return valueForRef(ref);
    } else {
      return Reflect.get(target, prop, receiver);
    }
  }

  set(target: Record<string, unknown>, prop: string | number, receiver: unknown) {
    assert(
      `You attempted to set the "${prop}" value on an object generated using the (hash) helper, but this is not supported because it was defined on the original hash and is a reference to the original value. You can set values which were _not_ defined on the hash, but you cannot set values defined on the original hash (e.g. {{hash myValue=123}})`,
      !(prop in this.named)
    );

    return Reflect.set(target, prop, receiver);
  }

  has(target: Record<string, unknown>, prop: string | number) {
    return prop in this.named || prop in target || prop === CUSTOM_TAG_FOR;
  }

  ownKeys(target: {}) {
    return Reflect.ownKeys(this.named).concat(Reflect.ownKeys(target));
  }

  getOwnPropertyDescriptor(target: {}, prop: string | number) {
    if (prop in this.named) {
      return {
        enumerable: true,
        configurable: true,
      };
    }

    return Reflect.getOwnPropertyDescriptor(target, prop);
  }
}

if (HAS_NATIVE_PROXY) {
  hashProxyFor = (named) => {
    const proxy = new Proxy(Object.create(null), new HashProxy(named));

    return proxy;
  };
} else {
  hashProxyFor = (named) => {
    let proxy = Object.create(null);

    Object.keys(named).forEach((name) => {
      Object.defineProperty(proxy, name, {
        enumerable: true,
        configurable: true,
        get() {
          return valueForRef(named[name]);
        },
      });
    });

    proxy[CUSTOM_TAG_FOR] = (_obj: object, key: string) => tagForKey(named, key);

    return proxy;
  };
}

/**
   Use the `{{hash}}` helper to create a hash to pass as an option to your
   components. This is specially useful for contextual components where you can
   just yield a hash:

   ```handlebars
   {{yield (hash
      name='Sarah'
      title=office
   )}}
   ```

   Would result in an object such as:

   ```js
   { name: 'Sarah', title: this.get('office') }
   ```

   Where the `title` is bound to updates of the `office` property.

   Note that the hash is an empty object with no prototype chain, therefore
   common methods like `toString` are not available in the resulting hash.
   If you need to use such a method, you can use the `call` or `apply`
   approach:

   ```js
   function toString(obj) {
     return Object.prototype.toString.apply(obj);
   }
   ```

   @method hash
   @for Ember.Templates.helpers
   @param {Object} options
   @return {Object} Hash
   @since 2.3.0
   @public
 */
export default function hash(args: VMArguments): Reference<Dict<unknown>> {
  let named = args.named.capture();

  return createConstRef(hashProxyFor(named), 'hash');
}
