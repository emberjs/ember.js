import { _instrumentStart } from 'ember-metal/instrumentation';

function componentInstrumentDetails(component) {
  return component.instrumentDetails({});
}

function emptyInstrumentDetails() {
  return {};
}

/**
  Provides instrumentation for node managers.

  Wrap your node manager's render and re-render methods
  with this function.

  @param {Object} component Component or View instance (optional).
  @param {Function} callback The function to instrument.
  @param {Object} context The context to call the function with.
  @return {Object} Return value from the invoked callback.
  @private
*/
export function instrument(component, callback, context) {
  let instrumentName, payload, payloadParam, val, end;

  if (typeof component === 'object' && component) {
    if (component.instrumentName === 'component') {
      instrumentName = 'render.component';
    } else {
      instrumentName = `render.${component.instrumentName}`;
    }

    payload = componentInstrumentDetails;
    payloadParam = component;
  } else {
    instrumentName = 'render.node';
    payload = emptyInstrumentDetails;
    payloadParam = null;
  }

  end = _instrumentStart(instrumentName, payload, payloadParam);
  val = callback.call(context);
  end();

  return val;
}
