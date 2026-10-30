import type Owner from '@ember/-internals/owner';
import { getOwner, setOwner } from '@ember/-internals/owner';
import { destroy, isDestroyed, isDestroying, registerDestructor } from '@glimmer/destroyable';

const DESTROY_CALLED = new WeakSet<PlainFrameworkObject>();

/**
  `destroy()` of `@ember/destroyable` also runs the `destroy` method, so that
  the teardown of subclasses runs either way.
*/
function ensureDestroyCalled(instance: PlainFrameworkObject) {
  if (!DESTROY_CALLED.has(instance)) {
    instance.destroy();
  }
}

/**
  The base of the core framework classes, such as `Application` and
  `EmberRouter`, when the `EMBER_DROP_CLASSIC_FEATURES` build flag is set.
  It extends no other class.

  `create` assigns the properties, then calls `init`, in the same order as
  `EmberObject`. The core classes set themselves up in `init`, because the
  properties of `create` and the fields of subclasses do not exist yet in
  the constructor.
*/
export default class PlainFrameworkObject {
  static create<T extends PlainFrameworkObject>(this: new (owner?: Owner) => T, props?: object): T {
    let instance = new this(props === undefined ? undefined : getOwner(props));

    if (props !== undefined) {
      Object.assign(instance, props);
    }

    instance.init(props);

    return instance;
  }

  constructor(owner?: Owner) {
    if (owner !== undefined) {
      setOwner(this, owner);
    }

    registerDestructor(this, ensureDestroyCalled, true);
    registerDestructor(this, () => this.willDestroy());
  }

  init(_properties?: object): void {}

  willDestroy(): void {}

  destroy(): this {
    DESTROY_CALLED.add(this);

    try {
      destroy(this);
    } finally {
      DESTROY_CALLED.delete(this);
    }

    return this;
  }

  get isDestroying(): boolean {
    return isDestroying(this);
  }

  get isDestroyed(): boolean {
    return isDestroyed(this);
  }
}
