/**
@module ember
@submodule ember-testing
*/
import { fireEvent } from '../events';
/**
  Triggers the given DOM event on the element identified by the provided selector.
  Example:
  ```javascript
  triggerEvent('#some-elem-id', 'blur');
  ```
  This is actually used internally by the `keyEvent` helper like so:
  ```javascript
  triggerEvent('#some-elem-id', 'keypress', { keyCode: 13 });
  ```
 @method triggerEvent
 @param {String} selector jQuery selector for finding element on the DOM
 @param {String} [context] jQuery selector that will limit the selector
                           argument to find only within the context's children
 @param {String} type The event type to be triggered.
 @param {Object} [options] The options to be passed to jQuery.Event.
 @return {RSVP.Promise<undefined>}
 @since 1.5.0
 @public
*/
export default function triggerEvent(app, selector, contextOrType, typeOrOptions, possibleOptions) {
  let arity = arguments.length;
  let context, type, options;

  if (arity === 3) {
    // context and options are optional, so this is
    // app, selector, type
    context = null;
    type = contextOrType;
    options = {};
  } else if (arity === 4) {
    // context and options are optional, so this is
    if (typeof typeOrOptions === 'object') {  // either
      // app, selector, type, options
      context = null;
      type = contextOrType;
      options = typeOrOptions;
    } else { // or
      // app, selector, context, type
      context = contextOrType;
      type = typeOrOptions;
      options = {};
    }
  } else {
    context = contextOrType;
    type = typeOrOptions;
    options = possibleOptions;
  }

  let $el = app.testHelpers.findWithAssert(selector, context);
  let el = $el[0];

  fireEvent(el, type, options);

  return app.testHelpers.wait();
}
