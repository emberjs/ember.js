import { run } from '../..';
import { Error as EmberError } from 'ember-debug';

QUnit.module('system/run_loop/unwind_test');

QUnit.test('RunLoop unwinds despite unhandled exception', function() {
  let initialRunLoop = run.currentRunLoop;

  throws(() => {
    run(() => {
      run.schedule('actions', function() { throw new EmberError('boom!'); });
    });
  }, Error, 'boom!');

  // The real danger at this point is that calls to autorun will stick
  // tasks into the already-dead runloop, which will never get
  // flushed. I can't easily demonstrate this in a unit test because
  // autorun explicitly doesn't work in test mode. - ef4
  equal(run.currentRunLoop, initialRunLoop, 'Previous run loop should be cleaned up despite exception');

  // Prevent a failure in this test from breaking subsequent tests.
  run.currentRunLoop = initialRunLoop;
});

QUnit.test('run unwinds despite unhandled exception', function() {
  var initialRunLoop = run.currentRunLoop;

  throws(() => {
    run(function() {
      throw new EmberError('boom!');
    });
  }, EmberError, 'boom!');

  equal(run.currentRunLoop, initialRunLoop, 'Previous run loop should be cleaned up despite exception');

  // Prevent a failure in this test from breaking subsequent tests.
  run.currentRunLoop = initialRunLoop;
});

