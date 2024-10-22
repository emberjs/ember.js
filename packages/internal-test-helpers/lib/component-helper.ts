import { getContext } from './test-context';

export function getComponent(): Record<string, unknown> {
  let context = getContext();
  if (!context) {
    throw new Error('Test context is not set up.');
  }

  let component = context['component'];
  if (component && typeof component === 'object') {
    return component;
  }

  throw new Error('`component` property on test context is not set up.');
}

export function getOwner() {
  let context = getContext();

  if (!context) {
    throw new Error('Test context is not set up.');
  }

  return context['owner'];
}

export function rerenderComponent() {
  let component = getComponent();

  if (typeof component['rerender'] !== 'function') {
    throw new Error('Component does not support `rerender`.');
  }

  component['rerender']();
}
