import RSVP from '../../ext/rsvp';
import { getAdapter, setAdapter } from '../../test/adapter';
import { isTesting, setTesting, run } from 'ember-metal';

const originalTestAdapter = getAdapter();
const originalTestingFlag = isTesting();

let asyncStarted = 0;
let asyncEnded = 0;

QUnit.module('ember-testing RSVP', {
  setup() {
    setTesting(true);
    setAdapter({
      asyncStart() {
        asyncStarted++;
        QUnit.stop();
      },
      asyncEnd() {
        asyncEnded++;
        QUnit.start();
      }
    });
  },
  teardown() {
    asyncStarted = 0;
    asyncEnded = 0;
    setAdapter(originalTestAdapter);
    setTesting(originalTestingFlag);
  }
});

QUnit.test('given `Ember.testing = true`, correctly informs the test suite about async steps', function() {
  expect(19);

  ok(!run.currentRunLoop, 'expect no run-loop');

  setTesting(true);

  equal(asyncStarted, 0);
  equal(asyncEnded, 0);

  let user = RSVP.Promise.resolve({
    name: 'tomster'
  });

  equal(asyncStarted, 0);
  equal(asyncEnded, 0);

  user.then(function(user) {
    equal(asyncStarted, 1);
    equal(asyncEnded, 1);

    equal(user.name, 'tomster');

    return RSVP.Promise.resolve(1).then(function() {
      equal(asyncStarted, 1);
      equal(asyncEnded, 1);
    });
  }).then(function() {
    equal(asyncStarted, 1);
    equal(asyncEnded, 1);

    return new RSVP.Promise(function(resolve) {
      QUnit.stop(); // raw async, we must inform the test framework manually
      setTimeout(function() {
        QUnit.start(); // raw async, we must inform the test framework manually

        equal(asyncStarted, 1);
        equal(asyncEnded, 1);

        resolve({
          name: 'async tomster'
        });

        equal(asyncStarted, 2);
        equal(asyncEnded, 1);
      }, 0);
    });
  }).then(function(user) {
    equal(user.name, 'async tomster');
    equal(asyncStarted, 2);
    equal(asyncEnded, 2);
  });
});
