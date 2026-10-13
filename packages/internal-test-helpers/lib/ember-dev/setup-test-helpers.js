import Application from '@ember/application';
import { setTesting } from '@ember/debug';
import { _backburner, schedule } from '@ember/runloop';
import { getContext, getRootElement, setApplication, settled } from '@ember/test-helpers';
import { registerDestructor } from '@glimmer/destroyable';
import { trackedValue } from '@glimmer/validator';
import { setup as setupQUnitDOM } from 'qunit-dom';
import { isMarker } from '../element-helpers';
import equalTokens from '../equal-tokens';
import { ModuleBasedResolver } from '../test-resolver';

/*
  The setup that the `tests/test-helper.js` of an app does for
  `@ember/test-helpers` and `ember-qunit`.

  An app gives one `Application` to `setApplication()`, for all tests.

  This test suite cannot keep an `Application` between tests, because
  `moduleFor` fails a test that leaves a namespace behind. So each test
  gets its own `Application`, which is destroyed with its instance.

  This file is JavaScript, because the type declarations of
  `@ember/test-helpers` do not resolve the `@ember/*` packages in this repo.
*/
export default function setupTestHelpers() {
  let options = {
    autoboot: false,
    rootElement: '#qunit-fixture',
    Resolver: ModuleBasedResolver,
  };

  let applicationPerTest = {
    Resolver: ModuleBasedResolver,

    boot() {
      return Promise.resolve(this);
    },

    buildInstance() {
      let application = Application.create(options);
      let instance = application.buildInstance();

      registerDestructor(instance, () => application.destroy());

      return {
        boot: () => application.boot().then(() => instance.boot()),
      };
    },
  };

  setApplication(applicationPerTest);

  // `teardownContext()` turns testing mode off, and `setupContext()` leaves
  // the backburner debug mode on.
  QUnit.testStart(() => {
    setTesting(true);
    _backburner.DEBUG = false;
  });

  setupQUnitDOM(QUnit.assert, { getRootElement });

  QUnit.assert.stableRender = stableRender;
}

function takeSnapshot() {
  let snapshot = [];
  let node = getContext().element.firstChild;

  while (node) {
    if (!isMarker(node)) {
      snapshot.push(node);
    }

    node = node.nextSibling;
  }

  return snapshot;
}

/*
  State that no template reads.

  A write to any tracked state makes the renderer run an update pass
  over every root.
  So a write here is a change that is unrelated to the test.
*/
let unrelated = trackedValue(0);

/*
  Asserts that the rendered DOM nodes keep their identity when an unrelated
  change causes a new render.

  With a string, it also compares the rendered HTML with the string.
  White space at the start and at the end of the rendered HTML does not
  count, so the content of a `<template>` can be on its own lines.

  This is the `assertStableRerender()` and the `renderComponent()` `expect`
  option of `RenderingTestCase`, for a test that uses `setupRenderingTest()`.
*/
async function stableRender(expected) {
  let before = takeSnapshot();

  await new Promise((resolve) => {
    unrelated.value++;

    // The `afterRender` queue comes after the update pass that the write
    // scheduled.
    schedule('afterRender', resolve);
  });

  await settled();

  if (typeof expected === 'string') {
    equalTokens(
      getContext().element.innerHTML.trim(),
      expected,
      `the rendered HTML is: \`${expected}\``
    );
  }

  let after = takeSnapshot();

  this.pushResult({
    result: before.length === after.length && before.every((node, i) => node === after[i]),
    actual: after,
    expected: before,
    message: 'the render kept the same DOM nodes',
  });
}
