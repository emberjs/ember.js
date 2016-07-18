import { focus, fireEvent } from '../events';

export default function click(app, selector, context) {
  let $el = app.testHelpers.findWithAssert(selector, context);
  let el = $el[0];

  fireEvent(el, 'mousedown');

  focus(el);

  fireEvent(el, 'mouseup');
  fireEvent(el, 'click');

  return app.testHelpers.wait();
}
