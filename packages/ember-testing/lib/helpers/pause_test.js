import RSVP from 'ember-runtime/ext/rsvp';
import Test from '../test';

export default function pauseTest() {
  Test.adapter.asyncStart();
  return new RSVP.Promise(function() { }, 'TestAdapter paused promise');
}
