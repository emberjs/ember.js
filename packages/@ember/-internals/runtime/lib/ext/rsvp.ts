import * as RSVP from 'rsvp';
import { _backburner, _rsvpErrorQueue } from '@ember/runloop';
import { getDispatchOverride } from '@ember/-internals/error-handling';
import { assert } from '@ember/debug';

RSVP.configure('async', (callback: unknown, promise: unknown) => {
  _backburner.schedule('actions', null, callback, promise);
});

RSVP.configure('after', (cb: unknown) => {
  _backburner.schedule(_rsvpErrorQueue, null, cb);
});

RSVP.on('error', onerrorDefault);

export function onerrorDefault(reason: unknown) {
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

interface ReasonWithErrorThrown {
  errorThrown: unknown;
}

interface ReasonWithName {
  name: unknown;
}

interface UnrecognizedURLError {
  name: 'UnrecognizedURLError';
  message: string;
}

function errorFor(reason: unknown) {
  if (!reason) return;

  let withErrorThrown = reason as ReasonWithErrorThrown;
  if (withErrorThrown.errorThrown) {
    return unwrapErrorThrown(withErrorThrown);
  }

  let withName = reason as UnrecognizedURLError;
  if (withName.name === 'UnrecognizedURLError') {
    assert(`The URL '${withName.message}' did not match any routes in your application`, false);
    // @ts-expect-error We'll hit this if the assert is stripped
    return;
  }

  if ((reason as ReasonWithName).name === 'TransitionAborted') {
    return;
  }

  return reason;
}

function unwrapErrorThrown(reason: ReasonWithErrorThrown) {
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
