/**
@module ember
@submodule ember-testing
*/
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
export default function findWithAssert(app, selector, context) {
  let $el = app.testHelpers.find(selector, context);
  if ($el.length === 0) {
    throw new Error('Element ' + selector + ' not found.');
  }
  return $el;
}
