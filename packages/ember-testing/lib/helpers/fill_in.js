/**
@module ember
@submodule ember-testing
*/
import { focus, fireEvent } from '../events';
/**
  Finds an element in the context of the app's container element. A simple alias
  for `app.$(selector)`.
  Example:
  ```javascript
  var $el = find('.my-selector');
  ```
  @method find
  @param {String} selector jQuery string selector for element lookup
  @return {Object} jQuery object representing the results of the query
  @public
*/

/**
  Finds an element in the context of the app's container element. A simple alias
  for `app.$(selector)`.
  Example:
  ```javascript
  var $el = find('.my-selector');
  ```
  @method find
  @param {String} selector jQuery string selector for element lookup
  @return {Object} jQuery object representing the results of the query
  @public
*/

export default function fillIn(app, selector, contextOrText, text) {
  let $el, el, context;
  if (typeof text === 'undefined') {
    text = contextOrText;
  } else {
    context = contextOrText;
  }
  $el = app.testHelpers.findWithAssert(selector, context);
  el = $el[0];
  focus(el);

  $el.val(text);
  fireEvent(el, 'input');
  fireEvent(el, 'change');

  return app.testHelpers.wait();
}
