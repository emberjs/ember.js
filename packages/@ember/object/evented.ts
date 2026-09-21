import {
  eventedOn,
  eventedOne,
  eventedTrigger,
  eventedOff,
  eventedHas,
} from '@ember/-internals/metal/lib/evented-methods';
import { InternalMixin } from '@ember/object/mixin-internal';
import { deprecateUntil, DEPRECATIONS } from '@ember/-internals/deprecations';

export { on } from '@ember/-internals/metal/lib/events';

/**
@module @ember/object/evented
*/

/**
  This mixin allows for Ember objects to subscribe to and emit events.

  ```app/utils/person.js
  import EmberObject from '@ember/object';
  import Evented from '@ember/object/evented';

  export default class Person extends EmberObject.extend(Evented) {
    greet() {
      // ...
      this.trigger('greet');
    }
  }
  ```

  ```javascript
  var person = Person.create();

  person.on('greet', function() {
    console.log('Our person has greeted');
  });

  person.greet();

  // outputs: 'Our person has greeted'
  ```

  You can also chain multiple event subscriptions:

  ```javascript
  person.on('greet', function() {
    console.log('Our person has greeted');
  }).one('greet', function() {
    console.log('Offer one-time special');
  }).off('event', this, forgetThis);
  ```

  @class Evented
  @public
  @deprecated Use native JavaScript events or a dedicated event library instead.
 */
interface Evented {
  /**
    Subscribes to a named event with given function.

    ```javascript
    person.on('didLoad', function() {
      // fired once the person has loaded
    });
    ```

    An optional target can be passed in as the 2nd argument that will
    be set as the "this" for the callback. This is a good way to give your
    function access to the object triggering the event. When the target
    parameter is used the callback method becomes the third argument.

    @method on
    @deprecated Use native JavaScript events or a dedicated event library instead.
    @param {String} name The name of the event
    @param {Object} [target] The "this" binding for the callback
    @param {Function|String} method A function or the name of a function to be called on `target`
    @return this
    @public
  */
  on<Target>(
    name: string,
    target: Target,
    method: string | ((this: Target, ...args: any[]) => void)
  ): this;
  on(name: string, method: ((...args: any[]) => void) | string): this;
  /**
    Subscribes a function to a named event and then cancels the subscription
    after the first time the event is triggered. It is good to use ``one`` when
    you only care about the first time an event has taken place.

    This function takes an optional 2nd argument that will become the "this"
    value for the callback. When the target parameter is used the callback method
    becomes the third argument.

    @method one
    @deprecated Use native JavaScript events or a dedicated event library instead.
    @param {String} name The name of the event
    @param {Object} [target] The "this" binding for the callback
    @param {Function|String} method A function or the name of a function to be called on `target`
    @return this
    @public
  */
  one<Target>(
    name: string,
    target: Target,
    method: string | ((this: Target, ...args: any[]) => void)
  ): this;
  one(name: string, method: string | ((...args: any[]) => void)): this;
  /**
    Triggers a named event for the object. Any additional arguments
    will be passed as parameters to the functions that are subscribed to the
    event.

    ```javascript
    person.on('didEat', function(food) {
      console.log('person ate some ' + food);
    });

    person.trigger('didEat', 'broccoli');

    // outputs: person ate some broccoli
    ```

    @method trigger
    @deprecated Use native JavaScript events or a dedicated event library instead.
    @param {String} name The name of the event
    @param {Object...} args Optional arguments to pass on
    @public
  */
  trigger(name: string, ...args: any[]): any;
  /**
    Cancels subscription for given name, target, and method.

    @method off
    @deprecated Use native JavaScript events or a dedicated event library instead.
    @param {String} name The name of the event
    @param {Object} target The target of the subscription
    @param {Function|String} method The function or the name of a function of the subscription
    @return this
    @public
  */
  off<Target>(
    name: string,
    target: Target,
    method: string | ((this: Target, ...args: any[]) => void)
  ): this;
  off(name: string, method: string | ((...args: any[]) => void)): this;
  /**
    Checks to see if object has any subscriptions for named event.

    @method has
    @deprecated Use native JavaScript events or a dedicated event library instead.
    @param {String} name The name of the event
    @return {Boolean} does the object have a subscription for event
    @public
   */
  has(name: string): boolean;
}
const Evented = InternalMixin.create({
  init() {
    this._super(...arguments);
    deprecateUntil(
      'The `Evented` mixin is deprecated. Use native JavaScript events or a dedicated event library instead.',
      DEPRECATIONS.DEPRECATE_EVENTED
    );
  },

  on(name: string, target: object, method?: string | Function) {
    eventedOn(this, name, target, method);
    return this;
  },

  one(name: string, target: object, method?: string | Function) {
    eventedOne(this, name, target, method);
    return this;
  },

  trigger(name: string, ...args: any[]) {
    eventedTrigger(this, name, args);
  },

  off(name: string, target: object, method?: string | Function) {
    eventedOff(this, name, target, method);
    return this;
  },

  has(name: string) {
    return eventedHas(this, name);
  },
});

export default Evented;
