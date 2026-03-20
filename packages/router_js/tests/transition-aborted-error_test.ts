import {
  throwIfAborted,
  isTransitionAborted,
  buildTransitionAborted,
} from '../lib/transition-aborted-error';

QUnit.module('transition-aborted-error');

QUnit.test('correct inheritance and name', function (assert) {
  let error;

  try {
    throw buildTransitionAborted();
  } catch (e) {
    error = e;
  }

  // it would be more correct with TransitionAbortedError, but other libraries may rely on this name
  assert.equal(
    (error as Error).name,
    'TransitionAborted',
    "TransitionAbortedError has the name 'TransitionAborted'"
  );

  assert.ok(isTransitionAborted(error));
  assert.ok(error instanceof Error);
});

QUnit.test('throwIfAborted', function (assert) {
  throwIfAborted(undefined);
  throwIfAborted(null);
  throwIfAborted({});
  throwIfAborted({ apple: false });
  throwIfAborted({ isAborted: false });
  throwIfAborted({ isAborted: false, other: 'key' });
  assert.throws(() => throwIfAborted({ isAborted: true }), /TransitionAborted/);
  assert.throws(() => throwIfAborted({ isAborted: true, other: 'key' }), /TransitionAborted/);
});
