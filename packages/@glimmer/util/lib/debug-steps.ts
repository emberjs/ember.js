/// <reference types="qunit" />

import { expect, localAssert } from '@glimmer/debug-util';
import { LOCAL_DEBUG, LOCAL_TRACE_LOGGING } from '@glimmer/local-debug-flags';

import { LOCAL_LOGGER } from './local-logger';

export let beginTestSteps: (() => void) | undefined;
export let endTestSteps: (() => void) | undefined;

export let verifySteps:
  | ((type: string, steps: unknown[] | ((steps: unknown[]) => void), message?: string) => void)
  | undefined;
export let logStep: ((type: string, steps: unknown) => void) | undefined;

if (LOCAL_DEBUG) {
  let LOGGED_STEPS: Record<string, unknown[]> | null = null;

  beginTestSteps = () => {
    localAssert(LOGGED_STEPS === null, 'attempted to start steps, but it already began');

    LOGGED_STEPS = {};
  };

  endTestSteps = () => {
    localAssert(LOGGED_STEPS, 'attempted to end steps, but they were not started');

    LOGGED_STEPS = null;
  };

  logStep = (type: string, step: unknown) => {
    if (LOCAL_TRACE_LOGGING) {
      LOCAL_LOGGER.log('STEP', type, step);
    }

    if (LOGGED_STEPS === null) return;

    let steps = LOGGED_STEPS[type];
    if (!steps) steps = LOGGED_STEPS[type] = [];

    steps.push(step);
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
      getCurrent().assert.deepEqual(steps, expectedSteps, message);
    } else {
      expectedSteps(steps);
    }
  };

  function getCurrent(): QUnit {
    return QUnit.config.current as QUnit;
  }
}
