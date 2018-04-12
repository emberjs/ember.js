import { RSVP } from 'ember-runtime';
import { backburner } from '@ember/runloop';
import { isTesting } from 'ember-debug';
import { asyncStart, asyncEnd } from '../test/adapter';

RSVP.configure('async', function(callback, promise) {
  // if schedule will cause autorun, we need to inform adapter
  if (isTesting() && !backburner.currentInstance) {
    asyncStart();
    backburner.schedule('actions', () => {
      asyncEnd();
      callback(promise);
    });
  } else {
    backburner.schedule('actions', () => callback(promise));
  }
});

export default RSVP;
