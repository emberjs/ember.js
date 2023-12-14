export { assertDestroyablesDestroyed, associateDestroyableChild, destroy, enableDestroyableTracking, isDestroying, isDestroyed } from '@glimmer/destroyable';
import { registerDestructor as _registerDestructor, unregisterDestructor as _unregisterDestructor } from '@glimmer/destroyable';
/**
  Ember manages the lifecycles and lifetimes of many built in constructs, such
  as components, and does so in a hierarchical way - when a parent component is
  destroyed, all of its children are destroyed as well.

  This destroyables API exposes the basic building blocks for destruction:

  * registering a function to be ran when an object is destroyed
  * checking if an object is in a destroying state
  * associate an object as a child of another so that the child object will be destroyed
    when the associated parent object is destroyed.

  @module @ember/destroyable
  @public
*/
/**
  This function is used to associate a destroyable object with a parent. When the parent
  is destroyed, all registered children will also be destroyed.

  ```js
  class CustomSelect extends Component {
    constructor(...args) {
      super(...args);

      // obj is now a child of the component. When the component is destroyed,
      // obj will also be destroyed, and have all of its destructors triggered.
      this.obj = associateDestroyableChild(this, {});
    }
  }
  ```

  Returns the associated child for convenience.

  @method associateDestroyableChild
  @for @ember/destroyable
  @param {Object|Function} parent the destroyable to entangle the child destroyables lifetime with
  @param {Object|Function} child the destroyable to be entangled with the parents lifetime
  @returns {Object|Function} the child argument
  @static
  @public
*/
/**
 Receives a destroyable, and returns true if the destroyable has begun destroying. Otherwise returns
 false.

  ```js
  let obj = {};
  isDestroying(obj); // false
  destroy(obj);
  isDestroying(obj); // true
  // ...sometime later, after scheduled destruction
  isDestroyed(obj); // true
  isDestroying(obj); // true
  ```

  @method isDestroying
  @for @ember/destroyable
  @param {Object|Function} destroyable the object to check
  @returns {Boolean}
  @static
  @public
*/
/**
  Receives a destroyable, and returns true if the destroyable has finished destroying. Otherwise
  returns false.

  ```js
  let obj = {};

  isDestroyed(obj); // false
  destroy(obj);

  // ...sometime later, after scheduled destruction

  isDestroyed(obj); // true
  ```

  @method isDestroyed
  @for @ember/destroyable
  @param {Object|Function} destroyable the object to check
  @returns {Boolean}
  @static
  @public
*/
/**
  Initiates the destruction of a destroyable object. It runs all associated destructors, and then
  destroys all children recursively.

  ```js
  let obj = {};

  registerDestructor(obj, () => console.log('destroyed!'));

  destroy(obj); // this will schedule the destructor to be called

  // ...some time later, during scheduled destruction

  // destroyed!
  ```

  Destruction via `destroy()` follows these steps:

  1, Mark the destroyable such that `isDestroying(destroyable)` returns `true`
  2, Call `destroy()` on each of the destroyable's associated children
  3, Schedule calling the destroyable's destructors
  4, Schedule setting destroyable such that `isDestroyed(destroyable)` returns `true`

  This results in the entire tree of destroyables being first marked as destroying,
  then having all of their destructors called, and finally all being marked as isDestroyed.
  There won't be any in between states where some items are marked as `isDestroying` while
  destroying, while others are not.

  @method destroy
  @for @ember/destroyable
  @param {Object|Function} destroyable the object to destroy
  @static
  @public
*/
/**
  This function asserts that all objects which have associated destructors or associated children
  have been destroyed at the time it is called. It is meant to be a low level hook that testing
  frameworks can use to hook into and validate that all destroyables have in fact been destroyed.

  This function requires that `enableDestroyableTracking` was called previously, and is only
  available in non-production builds.

  @method assertDestroyablesDestroyed
  @for @ember/destroyable
  @static
  @public
*/
/**
  This function instructs the destroyable system to keep track of all destroyables (their
  children, destructors, etc). This enables a future usage of `assertDestroyablesDestroyed`
  to be used to ensure that all destroyable tasks (registered destructors and associated children)
  have completed when `assertDestroyablesDestroyed` is called.

  @method enableDestroyableTracking
  @for @ember/destroyable
  @static
  @public
*/
/**
  Receives a destroyable object and a destructor function, and associates the
  function with it. When the destroyable is destroyed with destroy, or when its
  parent is destroyed, the destructor function will be called.

  ```js
  import Component from '@glimmer/component';
  import { registerDestructor } from '@ember/destroyable';

  class Modal extends Component {
    @service resize;

    constructor(...args) {
      super(...args);

      this.resize.register(this, this.layout);

      registerDestructor(this, () => this.resize.unregister(this));
    }
  }
  ```

  Multiple destructors can be associated with a given destroyable, and they can be
  associated over time, allowing libraries to dynamically add destructors as needed.
  `registerDestructor` also returns the associated destructor function, for convenience.

  The destructor function is passed a single argument, which is the destroyable itself.
  This allows the function to be reused multiple times for many destroyables, rather
  than creating a closure function per destroyable.

  ```js
  import Component from '@glimmer/component';
  import { registerDestructor } from '@ember/destroyable';

  function unregisterResize(instance) {
    instance.resize.unregister(instance);
  }

  class Modal extends Component {
    @service resize;

    constructor(...args) {
      super(...args);

      this.resize.register(this, this.layout);

      registerDestructor(this, unregisterResize);
    }
  }
  ```

  @method registerDestructor
  @for @ember/destroyable
  @param {Object|Function} destroyable the destroyable to register the destructor function with
  @param {Function} destructor the destructor to run when the destroyable object is destroyed
  @static
  @public
*/
export function registerDestructor(destroyable, destructor) {
  return _registerDestructor(destroyable, destructor);
}
/**
  Receives a destroyable and a destructor function, and de-associates the destructor
  from the destroyable.

  ```js
  import Component from '@glimmer/component';
  import { registerDestructor, unregisterDestructor } from '@ember/destroyable';

  class Modal extends Component {
    @service modals;

    constructor(...args) {
      super(...args);

      this.modals.add(this);

      this.modalDestructor = registerDestructor(this, () => this.modals.remove(this));
    }

    @action pinModal() {
      unregisterDestructor(this, this.modalDestructor);
    }
  }
  ```

  @method unregisterDestructor
  @for @ember/destroyable
  @param {Object|Function} destroyable the destroyable to unregister the destructor function from
  @param {Function} destructor the destructor to remove from the destroyable
  @static
  @public
*/
export function unregisterDestructor(destroyable, destructor) {
  return _unregisterDestructor(destroyable, destructor);
}