import Application from '@ember/application';
import { setTesting } from '@ember/debug';
import { _backburner } from '@ember/runloop';
import { setApplication } from '@ember/test-helpers';
import { registerDestructor } from '@glimmer/destroyable';
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
}
