/**
@module ember
@submodule ember-testing
*/
import { RSVP } from 'ember-runtime';

/**
 Pauses the current test - this is useful for debugging while testing or for test-driving.
 It allows you to inspect the state of your application at any point.
 Example (The test will pause before clicking the button):
 ```javascript
 visit('/')
 return pauseTest();
 click('.btn');
 ```
 @since 1.9.0
 @method pauseTest
 @return {Object} A promise that will never resolve
 @public
*/
export default function pauseTest() {
  return new RSVP.Promise(function() { }, 'TestAdapter paused promise');
}
