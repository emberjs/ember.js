/**
@module ember
*/
import { focus, fireEvent } from '../events';

/**
  Fills in an input element with some text.

  Example:

  ```javascript
  fillIn('#email', 'you@example.com').then(function() {
    // assert something
  });
  ```

  @method fillIn
  @param {String} selector jQuery selector finding an input element on the DOM
  to fill text with
  @param {String} text text to place inside the input element
  @return {RSVP.Promise<undefined>}
  @public
*/
export default function fillIn(app, selector, contextOrText, text) {
  let $el, el, context;
  if (text === undefined) {
    text = contextOrText;
  } else {
    context = contextOrText;
  }
  $el = app.testHelpers.findWithAssert(selector, context);
  el = $el[0];
  focus(el);

  $el.eq(0).val(text);
  fireEvent(el, 'input');
  fireEvent(el, 'change');

  return app.testHelpers.wait();
}
