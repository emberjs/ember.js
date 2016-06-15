import run from 'ember-metal/run_loop';
import { fireEvent } from '../events';

export default function triggerEvent(app, selector, contextOrType, typeOrOptions, possibleOptions) {
  let arity = arguments.length;
  let context, type, options;

  if (arity === 3) {
    // context and options are optional, so this is
    // app, selector, type
    context = null;
    type = contextOrType;
    options = {};
  } else if (arity === 4) {
    // context and options are optional, so this is
    if (typeof typeOrOptions === 'object') {  // either
      // app, selector, type, options
      context = null;
      type = contextOrType;
      options = typeOrOptions;
    } else { // or
      // app, selector, context, type
      context = contextOrType;
      type = typeOrOptions;
      options = {};
    }
  } else {
    context = contextOrType;
    type = typeOrOptions;
    options = possibleOptions;
  }

  let $el = app.testHelpers.findWithAssert(selector, context);
  let el = $el[0];

  run(null, fireEvent, el, type, options);

  return app.testHelpers.wait();
}
