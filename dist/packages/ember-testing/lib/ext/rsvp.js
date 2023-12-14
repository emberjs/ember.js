import { RSVP } from '@ember/-internals/runtime';
import { _backburner } from '@ember/runloop';
RSVP.configure('async', function (callback, promise) {
  // if schedule will cause autorun, we need to inform adapter
  _backburner.schedule('actions', () => callback(promise));
});
export default RSVP;