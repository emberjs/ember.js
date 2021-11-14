import { RSVP } from '@ember/-internals/runtime';
import { _backburner } from '@ember/runloop';
import { isTesting } from '@ember/debug';
import { asyncStart, asyncEnd } from '../test/adapter';

RSVP.configure('async', function (callback, promise) {
  // if schedule will cause autorun, we need to inform adapter
  if (isTesting() && !_backburner.currentInstance) {
    asyncStart();
    _backburner.schedule('actions', () => {
      asyncEnd();
      callback(promise);
    });
  } else {
    _backburner.schedule('actions', () => callback(promise));
  }
});

export default RSVP;
