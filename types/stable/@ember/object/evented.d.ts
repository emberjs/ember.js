declare module '@ember/object/evented' {
  import Mixin from '@ember/object/mixin';
  export { on } from '@ember/-internals/metal';
  /**
    @module @ember/object/evented
    */
  /**
      This mixin allows for Ember objects to subscribe to and emit events.

      ```app/utils/person.js
      import EmberObject from '@ember/object';
      import Evented from '@ember/object/evented';

      export default EmberObject.extend(Evented, {
        greet() {
          // ...
          this.trigger('greet');
        }
      });
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
          @param {String} name The name of the event
          @param {Object...} args Optional arguments to pass on
          @public
        */
    trigger(name: string, ...args: any[]): any;
    /**
          Cancels subscription for given name, target, and method.
      
          @method off
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
          @param {String} name The name of the event
          @return {Boolean} does the object have a subscription for event
          @public
         */
    has(name: string): boolean;
  }
  const Evented: Mixin;
  export default Evented;
}
