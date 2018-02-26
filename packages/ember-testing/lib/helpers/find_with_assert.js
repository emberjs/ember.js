/**
@module ember
*/
/**
  Like `find`, but throws an error if the element selector returns no results.

  Example:

  ```javascript
  var $el = findWithAssert('.doesnt-exist'); // throws error
  ```

  With the `context` param:

  ```javascript
  var $el = findWithAssert('.selector-id', '.parent-element-class'); // assert will pass
  ```

  @method findWithAssert
  @param {String} selector jQuery selector string for finding an element within
  the DOM
  @param {String} [context] (optional) jQuery selector that will limit the
  selector argument to find only within the context's children
  @return {Object} jQuery object representing the results of the query
  @throws {Error} throws error if jQuery object returned has a length of 0
  @public
*/
export default function findWithAssert(app, selector, context) {
  let $el = app.testHelpers.find(selector, context);
  if ($el.length === 0) {
    throw new Error('Element ' + selector + ' not found.');
  }
  return $el;
}
