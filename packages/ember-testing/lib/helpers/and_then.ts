import { assert } from '@ember/debug';
import type { TestableApp } from '../ext/application';

export default function andThen(app: TestableApp, callback: (app: TestableApp) => unknown) {
  let wait = app.testHelpers['wait'];
  assert('[BUG] Missing wait helper', wait);
  return wait(callback(app));
}
