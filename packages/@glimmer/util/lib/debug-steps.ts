import { LOCAL_DEBUG } from '@glimmer/local-debug-flags';
import assert from './assert';
import { expect } from './platform-utils';

export let beginTestSteps: (() => void) | undefined;
export let endTestSteps: (() => void) | undefined;

export let verifySteps:
  | ((type: string, steps: unknown[] | ((steps: unknown[]) => void), message?: string) => void)
  | undefined;
export let logStep: ((type: string, steps: unknown) => void) | undefined;

if (LOCAL_DEBUG) {
  let LOGGED_STEPS: Record<string, unknown[]> | null = null;

  beginTestSteps = () => {
    assert(LOGGED_STEPS === null, 'attempted to start steps, but it already began');

    LOGGED_STEPS = {};
  };

  endTestSteps = () => {
    assert(LOGGED_STEPS, 'attempted to end steps, but they were not started');

    LOGGED_STEPS = null;
  };

  logStep = (type: string, step: unknown) => {
    if (LOGGED_STEPS === null) return;

    LOGGED_STEPS[type] = LOGGED_STEPS[type] || [];
    LOGGED_STEPS[type].push(step);
  };

  verifySteps = (
    type: string,
    expectedSteps: unknown[] | ((steps: unknown[]) => void),
    message?: string
  ) => {
    let loggedSteps = expect(LOGGED_STEPS, 'attempetd to verify steps, but steps were not started');

    let steps = loggedSteps[type] || [];

    loggedSteps[type] = [];

    if (Array.isArray(expectedSteps)) {
      QUnit.config.current.assert.deepEqual(steps, expectedSteps, message);
    } else {
      expectedSteps(steps);
    }
  };
}
