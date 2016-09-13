/**
@module ember
@submodule ember-testing
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

  Advanced example, overriding the client coordinate and using the right mouse button:

  ```javascript
  click('.some-jQuery-selector', null, {button: 3, clientX: 17, clientY: 40}).then(function() {
    // assert something
  });
  ```

  @method click
  @param {String} selector jQuery selector for finding an element in the DOM. Note that only the first match will be clicked.
  @param {Object} context A DOM Element, Document, or jQuery to use as context.
    If null or undefined, default is the root application DOM element.
  @param {Object} event An optional hash of event parameters to mock the JQuery [Event]{@link http://api.jquery.com/category/events/event-object/} object.
    Default button (and which) is left button (1), and default screen and client coordinates
    are the top left corner of the element.
  @return {RSVP.Promise}
  @public
*/
export default function click(app, selector, context, event) {
  let $el = app.testHelpers.findWithAssert(selector, context);
  let el = $el[0];

  fireEvent(el, 'mousedown', event);

  focus(el);

  fireEvent(el, 'mouseup', event);
  fireEvent(el, 'click', event);

  return app.testHelpers.wait();
}
