import RSVP from 'ember-runtime/ext/rsvp';
import run from 'ember-metal/run_loop';
import { isTesting } from 'ember-metal/testing';
import {
  asyncStart,
  asyncEnd
} from '../test/adapter';

RSVP.configure('async', function(callback, promise) {
  // if schedule will cause autorun, we need to inform adapter
  if (isTesting() && !run.backburner.currentInstance) {
    asyncStart();
    run.backburner.schedule('actions', () => {
      asyncEnd();
      callback(promise);
    });
  } else {
    run.backburner.schedule('actions', () => callback(promise));
  }
});

export default RSVP;
