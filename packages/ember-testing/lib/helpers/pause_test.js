/**
@module ember
@submodule ember-testing
*/
import { RSVP } from 'ember-runtime';
import Logger from 'ember-console';
import { assert, isFeatureEnabled } from 'ember-debug';

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
  if (isFeatureEnabled('ember-testing-resume-test')) {
    Logger.info('Testing paused. Use `resumeTest()` to continue.');
  }

  return new RSVP.Promise((resolve) => {
    if (isFeatureEnabled('ember-testing-resume-test')) {
      resume = resolve;
    }
  }, 'TestAdapter paused promise');
}
