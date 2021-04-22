import { DEBUG } from '@glimmer/env';
import { CapturedArguments, CapturedNamedArguments, Dict } from '@glimmer/interfaces';
import { setCustomTagFor } from '@glimmer/manager';
import { createConstRef, Reference, valueForRef } from '@glimmer/reference';
import { dict, HAS_NATIVE_PROXY } from '@glimmer/util';
import { Tag, track } from '@glimmer/validator';
import { assert } from '@glimmer/global-context';
import { internalHelper } from './internal-helper';

function tagForKey(hash: Record<string, unknown>, key: string): Tag {
  return track(() => hash[key]);
}

let hashProxyFor: (args: CapturedNamedArguments) => Record<string, unknown>;

class HashProxy implements ProxyHandler<Record<string, unknown>> {
  constructor(private named: CapturedNamedArguments) {}

  get(target: Record<string, unknown>, prop: string | number, receiver: unknown) {
    const ref = this.named[prop as string];

    if (ref !== undefined) {
      return valueForRef(ref);
    } else {
      return Reflect.get(target, prop, receiver);
    }
  }

  set(target: Record<string, unknown>, prop: string | number, receiver: unknown) {
    assert(
      !(prop in this.named),
      `You attempted to set the "${prop}" value on an object generated using the (hash) helper, but this is not supported because it was defined on the original hash and is a reference to the original value. You can set values which were _not_ defined on the hash, but you cannot set values defined on the original hash (e.g. {{hash myValue=123}})`
    );

    return Reflect.set(target, prop, receiver);
  }

  has(target: Record<string, unknown>, prop: string | number) {
    return prop in this.named || prop in target;
  }

  ownKeys(target: {}) {
    return Reflect.ownKeys(this.named).concat(Reflect.ownKeys(target));
  }

  getOwnPropertyDescriptor(target: {}, prop: string | number) {
    if (DEBUG && !(prop in this.named)) {
      throw new Error(
        `args proxies do not have real property descriptors, so you should never need to call getOwnPropertyDescriptor yourself. This code exists for enumerability, such as in for-in loops and Object.keys(). Attempted to get the descriptor for \`${String(
          prop
        )}\``
      );
    }

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
    const proxy = new Proxy(dict(), new HashProxy(named));

    setCustomTagFor(proxy, (_obj: object, key: string) => tagForKey(named, key));

    return proxy;
  };
} else {
  hashProxyFor = (named) => {
    let proxy = dict();

    Object.keys(named).forEach((name) => {
      Object.defineProperty(proxy, name, {
        enumerable: true,
        configurable: true,
        get() {
          return valueForRef(named[name]);
        },
      });
    });

    setCustomTagFor(proxy, (_obj: object, key: string) => tagForKey(named, key));

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
   @param {Object} options
   @return {Object} Hash
   @public
 */
export default internalHelper(
  ({ named }: CapturedArguments): Reference<Dict<unknown>> => {
    return createConstRef(hashProxyFor(named), 'hash');
  }
);
