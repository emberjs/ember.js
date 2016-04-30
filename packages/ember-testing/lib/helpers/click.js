import run from 'ember-metal/run_loop';
import { focus, fireEvent } from '../events';

export default function click(app, selector, context) {
  let $el = app.testHelpers.findWithAssert(selector, context);
  let el = $el[0];

  run(null, fireEvent, el, 'mousedown');

  focus(el);

  run(null, fireEvent, el, 'mouseup');
  run(null, fireEvent, el, 'click');

  return app.testHelpers.wait();
}
