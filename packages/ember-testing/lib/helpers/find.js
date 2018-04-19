/**
@module ember
*/
import { get } from 'ember-metal';
import { assert } from '@ember/debug';
import { jQueryDisabled } from 'ember-views';

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
  @param {String} selector jQuery selector for element lookup
  @param {String} [context] (optional) jQuery selector that will limit the selector
                            argument to find only within the context's children
  @return {Object} DOM element representing the results of the query
  @public
*/
export default function find(app, selector, context) {
  if (jQueryDisabled) {
    assert(
      'If jQuery is disabled, please import and use helpers from @ember/test-helpers [https://github.com/emberjs/ember-test-helpers]. Note: `find` is not an available helper.'
    );
  }
  let $el;
  context = context || get(app, 'rootElement');
  $el = app.$(selector, context);
  return $el;
}
