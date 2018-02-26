/**
@module ember
*/
import { focus, fireEvent } from '../events';

/**
  Clicks an element and triggers any actions triggered by the element's `click`
  event.

  Example:

  ```javascript
  click('.some-jQuery-selector').then(function() {
    // assert something
  });
  ```

  @method click
  @param {String} selector jQuery selector for finding element on the DOM
  @param {Object} context A DOM Element, Document, or jQuery to use as context
  @return {RSVP.Promise<undefined>}
  @public
*/
export default function click(app, selector, context) {
  let $el = app.testHelpers.findWithAssert(selector, context);
  let el = $el[0];

  fireEvent(el, 'mousedown');

  focus(el);

  fireEvent(el, 'mouseup');
  fireEvent(el, 'click');

  return app.testHelpers.wait();
}
