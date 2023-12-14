declare module '@ember/debug/lib/deprecate' {
  import type { HandlerCallback } from '@ember/debug/lib/handlers';
  interface Available {
    available: string;
  }
  interface Enabled extends Available {
    enabled: string;
  }
  export interface DeprecationOptions {
    id: string;
    until: string;
    url?: string;
    for: string;
    since: Available | Enabled;
  }
  export type DeprecateFunc = (
    message: string,
    test?: boolean,
    options?: DeprecationOptions
  ) => void;
  export type MissingOptionDeprecateFunc = (id: string, missingOption: string) => string;
  /**
     @module @ember/debug
     @public
    */
  /**
      Allows for runtime registration of handler functions that override the default deprecation behavior.
      Deprecations are invoked by calls to [@ember/debug/deprecate](/ember/release/classes/@ember%2Fdebug/methods/deprecate?anchor=deprecate).
      The following example demonstrates its usage by registering a handler that throws an error if the
      message contains the word "should", otherwise defers to the default handler.

      ```javascript
      import { registerDeprecationHandler } from '@ember/debug';

      registerDeprecationHandler((message, options, next) => {
        if (message.indexOf('should') !== -1) {
          throw new Error(`Deprecation message with should: ${message}`);
        } else {
          // defer to whatever handler was registered before this one
          next(message, options);
        }
      });
      ```

      The handler function takes the following arguments:

      <ul>
        <li> <code>message</code> - The message received from the deprecation call.</li>
        <li> <code>options</code> - An object passed in with the deprecation call containing additional information including:</li>
          <ul>
            <li> <code>id</code> - An id of the deprecation in the form of <code>package-name.specific-deprecation</code>.</li>
            <li> <code>until</code> - The Ember version number the feature and deprecation will be removed in.</li>
          </ul>
        <li> <code>next</code> - A function that calls into the previously registered handler.</li>
      </ul>

      @public
      @static
      @method registerDeprecationHandler
      @for @ember/debug
      @param handler {Function} A function to handle deprecation calls.
      @since 2.1.0
    */
  let registerHandler: (handler: HandlerCallback<DeprecationOptions>) => void;
  let missingOptionsDeprecation: string;
  let missingOptionsIdDeprecation: string;
  let missingOptionDeprecation: MissingOptionDeprecateFunc;
  let deprecate: DeprecateFunc;
  export default deprecate;
  export {
    registerHandler,
    missingOptionsDeprecation,
    missingOptionsIdDeprecation,
    missingOptionDeprecation,
  };
}
