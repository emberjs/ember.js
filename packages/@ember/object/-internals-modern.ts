export { guidFor } from '@ember/-internals/utils/lib/guid';

import { getFactoryFor, setFactoryFor } from '@ember/-internals/container/lib/container';
import { getOwner, setOwner } from '@ember/-internals/owner';
import type Owner from '@ember/-internals/owner';
import { guidFor } from '@ember/-internals/utils/lib/guid';
import { assert } from '@ember/debug';
import { destroy, isDestroying, isDestroyed, registerDestructor } from '@glimmer/destroyable';
import { DEBUG } from '@glimmer/env';

/*
  The modern replacement for `FrameworkObject` (see `-internals.ts`), swapped
  in at the build level for variants without the classic object model. It is
  a plain native class that satisfies the pieces of the CoreObject contract
  the framework classes (Service, Route, EmberRouter, Controller, Engine,
  EngineInstance, Namespace, class-based Helper) and the container actually
  rely on:

  - `static create(props)`: the container's factory manager calls
    `Class.create(props)` with owner and factory already attached to the
    props bag (see `InternalFactoryManager.create`).
  - `init()`: runs after create's property assignment; subclasses must call
    `super.init(...arguments)`.
  - `destroy()`/`willDestroy()`/`isDestroying`/`isDestroyed` via
    `@glimmer/destroyable`, mirroring CoreObject's wiring.

  Deliberately absent: Mixin support (`extend`/`reopen`/`reopenClass`),
  Observable (`this.get`/`this.set`), `concatenatedProperties`/
  `mergedProperties`, `unknownProperty` proxies, and the metal event system.
*/

const destroyCalled = new Set<FrameworkObject>();

function ensureDestroyCalled(instance: FrameworkObject) {
  if (!destroyCalled.has(instance)) {
    instance.destroy();
  }
}

let initCalled: WeakSet<FrameworkObject> | undefined;
if (DEBUG) {
  initCalled = new WeakSet();
}

class FrameworkObject {
  constructor(owner?: Owner) {
    if (owner !== undefined) {
      setOwner(this, owner);
    }

    registerDestructor(this, ensureDestroyCalled, true);
    registerDestructor(this, () => this.willDestroy());
  }

  static create<C extends typeof FrameworkObject, I extends InstanceType<C>>(
    this: C,
    props?: Partial<I>
  ): I {
    let instance: I;

    if (props !== undefined) {
      assert(
        `${this.name}.create only accepts objects.`,
        typeof props === 'object' && props !== null
      );

      instance = new this(getOwner(props)) as I;

      let factory = getFactoryFor(props);
      if (factory !== undefined) {
        setFactoryFor(instance, factory);
      }

      Object.assign(instance, props);
    } else {
      instance = new this() as I;
    }

    instance.init(props);

    assert(
      `You must call \`super.init(...arguments);\` when overriding \`init\` on a framework object. Please update ${instance} to call \`super.init(...arguments);\` from \`init\`.`,
      !DEBUG || initCalled!.has(instance)
    );

    return instance;
  }

  init(_properties?: object | undefined) {
    if (DEBUG) {
      initCalled!.add(this);
    }
  }

  willDestroy() {}

  destroy() {
    // Ensure that manually calling `.destroy()` does not immediately call
    // destroy again via the registered destructor.
    destroyCalled.add(this);

    try {
      destroy(this);
    } finally {
      destroyCalled.delete(this);
    }

    return this;
  }

  get isDestroying() {
    return isDestroying(this);
  }

  get isDestroyed() {
    return isDestroyed(this);
  }

  toString() {
    return `<${getFactoryFor(this) || '(unknown)'}:${guidFor(this)}>`;
  }
}

export { FrameworkObject };
