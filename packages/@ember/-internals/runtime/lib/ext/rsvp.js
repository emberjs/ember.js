import * as RSVP from 'rsvp';
import { backburner, _rsvpErrorQueue } from '@ember/runloop';
import { getDispatchOverride } from '@ember/-internals/error-handling';
import { assert } from '@ember/debug';

RSVP.configure('async', (callback, promise) => {
  backburner.schedule('actions', null, callback, promise);
});

RSVP.configure('after', cb => {
  backburner.schedule(_rsvpErrorQueue, null, cb);
});

RSVP.on('error', onerrorDefault);

export function onerrorDefault(reason) {
  let error = errorFor(reason);
  if (error) {
    let overrideDispatch = getDispatchOverride();
    if (overrideDispatch) {
      overrideDispatch(error);
    } else {
      throw error;
    }
  }
}

function errorFor(reason) {
  if (!reason) return;

  if (reason.errorThrown) {
    return unwrapErrorThrown(reason);
  }

  if (reason.name === 'UnrecognizedURLError') {
    assert(`The URL '${reason.message}' did not match any routes in your application`, false);
    return;
  }

  if (reason.name === 'TransitionAborted') {
    return;
  }

  return reason;
}

function unwrapErrorThrown(reason) {
  let error = reason.errorThrown;
  if (typeof error === 'string') {
    error = new Error(error);
  }
  Object.defineProperty(error, '__reason_with_error_thrown__', {
    value: reason,
    enumerable: false,
  });
  return error;
}

export default RSVP;
