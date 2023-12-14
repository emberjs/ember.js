declare module '@ember/-internals/metal/lib/events' {
  /**
    @module @ember/object
    */
  import type { Meta } from '@ember/-internals/meta';
  import type { AnyFn } from '@ember/-internals/utility-types';
  /**
      Add an event listener

      @method addListener
      @static
      @for @ember/object/events
      @param obj
      @param {String} eventName
      @param {Object|Function} target A target object or a function
      @param {Function|String} method A function or the name of a function to be called on `target`
      @param {Boolean} once A flag whether a function should only be called once
      @public
    */
  export function addListener(
    obj: object,
    eventName: string,
    target: object | Function | null,
    method?: Function | PropertyKey,
    once?: boolean,
    sync?: boolean
  ): void;
  /**
      Remove an event listener

      Arguments should match those passed to `addListener`.

      @method removeListener
      @static
      @for @ember/object/events
      @param obj
      @param {String} eventName
      @param {Object|Function} target A target object or a function
      @param {Function|String} method A function or the name of a function to be called on `target`
      @public
    */
  export function removeListener(
    obj: object,
    eventName: string,
    targetOrFunction: object | Function | null,
    functionOrName?: string | Function
  ): void;
  /**
      Send an event. The execution of suspended listeners
      is skipped, and once listeners are removed. A listener without
      a target is executed on the passed object. If an array of actions
      is not passed, the actions stored on the passed object are invoked.

      @method sendEvent
      @static
      @for @ember/object/events
      @param obj
      @param {String} eventName
      @param {Array} params Optional parameters for each listener.
      @return {Boolean} if the event was delivered to one or more actions
      @public
    */
  export function sendEvent(
    obj: object,
    eventName: string,
    params?: any[],
    actions?: any[],
    _meta?: Meta | null
  ): boolean;
  /**
      @public
      @method hasListeners
      @static
      @for @ember/object/events
      @param obj
      @param {String} eventName
      @return {Boolean} if `obj` has listeners for event `eventName`
    */
  export function hasListeners(obj: object, eventName: string): boolean;
  /**
      Define a property as a function that should be executed when
      a specified event or events are triggered.

      ``` javascript
      import EmberObject from '@ember/object';
      import { on } from '@ember/object/evented';
      import { sendEvent } from '@ember/object/events';

      let Job = EmberObject.extend({
        logCompleted: on('completed', function() {
          console.log('Job completed!');
        })
      });

      let job = Job.create();

      sendEvent(job, 'completed'); // Logs 'Job completed!'
     ```

      @method on
      @static
      @for @ember/object/evented
      @param {String} eventNames*
      @param {Function} func
      @return {Function} the listener function, passed as last argument to on(...)
      @public
    */
  export function on<T extends AnyFn>(...args: [...eventNames: string[], func: T]): T;
}
