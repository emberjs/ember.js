/**
@module ember
@submodule ember-testing
*/
import { get } from 'ember-metal';

/**
  Finds an element in the context of the app's container element. A simple alias
  for `app.$(selector)`.

  Example:

  ```javascript
  var $el = find('.my-selector');
  ```

  With the `context` param:

  ```javascript
  var $el = find('.my-selector', '.parent-element-class');
  ```

  @method find
  @param {String} selector jQuery string selector for element lookup
  @param {String} [context] (optional) jQuery selector that will limit the selector
                            argument to find only within the context's children
  @return {Object} jQuery object representing the results of the query
  @public
*/
export default function find(app, selector, context) {
  let $el;
  context = context || get(app, 'rootElement');
  $el = app.$(selector, context);
  return $el;
}
