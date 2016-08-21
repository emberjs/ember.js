/**
@module ember
@submodule ember-testing
*/
import { get } from 'ember-metal/property_get';
/**
  Like `find`, but throws an error if the element selector returns no results.
  Example:
  ```javascript
  var $el = findWithAssert('.doesnt-exist'); // throws error
  ```
  @method findWithAssert
  @param {String} selector jQuery selector string for finding an element within
  the DOM
  @return {Object} jQuery object representing the results of the query
  @throws {Error} throws error if jQuery object returned has a length of 0
  @public
*/
export default function find(app, selector, context) {
  let $el;
  context = context || get(app, 'rootElement');
  $el = app.$(selector, context);
  return $el;
}
