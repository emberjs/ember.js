import { moduleFor, ModuleBasedTestResolver, ApplicationTestCase } from 'internal-test-helpers';
import { run } from '@ember/runloop';
import EmberApplication from '..';

let application, Application, _document, callbacks;
let readyWasCalled = 0;

const dispatchEvent = (eventName) => {
  callbacks[eventName].forEach((callback) => callback());
};

const removeEventListener = (eventName, callbackToRemove) => {
  callbacks[eventName] = callbacks[eventName].filter((callback) => callback !== callbackToRemove);
};

const addEventListener = (eventName, callback) => {
  callbacks[eventName] ? callbacks[eventName].push(callback) : (callbacks[eventName] = [callback]);
};

moduleFor(
  'Application readiness',
  class extends ApplicationTestCase {
    constructor() {
      super();

      callbacks = [];
      _document = {
        removeEventListener,
        addEventListener,
      };

      Application = EmberApplication.extend({
        Resolver: ModuleBasedTestResolver,
        _document,

        ready() {
          this._super();
          readyWasCalled++;
        },
      });
    }

    teardown() {
      if (application) {
        run(() => application.destroy());
        Application = application = _document = callbacks = undefined;
        readyWasCalled = 0;
      }
    }

    ["@test Application's ready event is called right away if DOM is already ready"](assert) {
      _document.readyState = 'interactive';

      run(() => {
        application = Application.create({
          router: false,
        });

        assert.equal(readyWasCalled, 0, 'ready is not called until later');
      });

      assert.equal(readyWasCalled, 1, 'ready was called');

      application.domReady();

      assert.equal(callbacks['DOMContentLoaded'], undefined);
      assert.equal(readyWasCalled, 1, "application's ready was not called again");
    }

    ["@test Application's ready event is called after the document becomes ready"](assert) {
      _document.readyState = 'loading';

      run(() => {
        application = Application.create({ router: false });
        assert.equal(callbacks['DOMContentLoaded'].length, 1);
      });

      assert.equal(readyWasCalled, 0, "ready wasn't called yet");

      dispatchEvent('DOMContentLoaded');

      assert.equal(callbacks['DOMContentLoaded'].length, 0);
      assert.equal(readyWasCalled, 1, 'ready was called now that DOM is ready');
    }

    ["@test Application's ready event can be deferred by other components"](assert) {
      _document.readyState = 'loading';

      run(() => {
        application = Application.create({ router: false });
        application.deferReadiness();
        assert.equal(readyWasCalled, 0, "ready wasn't called yet");
        assert.equal(callbacks['DOMContentLoaded'].length, 1);
      });

      assert.equal(readyWasCalled, 0, "ready wasn't called yet");

      application.domReady();

      assert.equal(readyWasCalled, 0, "ready wasn't called yet");

      run(() => {
        application.advanceReadiness();
        assert.equal(readyWasCalled, 0);
      });

      assert.equal(readyWasCalled, 1, 'ready was called now all readiness deferrals are advanced');

      dispatchEvent('DOMContentLoaded');

      assert.equal(callbacks['DOMContentLoaded'].length, 0);

      expectAssertion(() => {
        application.deferReadiness();
      });
    }
  }
);
