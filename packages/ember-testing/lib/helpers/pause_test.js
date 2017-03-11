/**
@module ember
@submodule ember-testing
*/
import { RSVP } from 'ember-runtime';
import Logger from 'ember-console';
import {
  assert
} from 'ember-debug';
import {
  EMBER_TESTING_RESUME_TEST
} from 'ember-features';

let resume;

/**
 Resumes a test paused by `pauseTest`.

 @method resumeTest
 @return {void}
 @public
*/
export function resumeTest() {
  assert('Testing has not been paused. There is nothing to resume.', resume);
  resume();
  resume = undefined;
}

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
export function pauseTest() {
  if (EMBER_TESTING_RESUME_TEST) {
    Logger.info('Testing paused. Use `resumeTest()` to continue.');
  }

  return new RSVP.Promise((resolve) => {
    if (EMBER_TESTING_RESUME_TEST) {
      resume = resolve;
    }
  }, 'TestAdapter paused promise');
}
