import { RSVP } from 'ember-runtime';
import { run } from 'ember-metal';
import { isTesting } from 'ember-debug';
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
