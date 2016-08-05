import { focus, fireEvent } from '../events';

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

  $el.eq(0).val(text);
  fireEvent(el, 'input');
  fireEvent(el, 'change');

  return app.testHelpers.wait();
}
