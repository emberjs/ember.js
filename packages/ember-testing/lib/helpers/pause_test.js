import RSVP from 'ember-runtime/ext/rsvp';

export default function pauseTest() {
  return new RSVP.Promise(function() { }, 'TestAdapter paused promise');
}
