import { getContext } from './test-context';

export function getElement(): Element {
  let context = getContext();
  if (!context) {
    throw new Error('Test context is not set up.');
  }

  let element = context.element;
  if (!element) {
    throw new Error('`element` property on test context is not set up.');
  }

  return element;
}
