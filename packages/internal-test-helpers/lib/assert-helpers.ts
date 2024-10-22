import { getContext } from './test-context';

export function getAssert(): QUnit['assert'] {
  let context = getContext();

  if (!context) {
    throw new Error('Test context is not set up.');
  }

  let assert = context['assert'];
  if (!assert) {
    throw new Error('`assert` property on test context is not set up.');
  }

  return assert;
}
