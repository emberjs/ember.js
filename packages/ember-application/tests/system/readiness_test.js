import { run } from 'ember-metal';
import EmberApplication from '../../system/application';

let jQuery, application, Application;
let readyWasCalled, domReady, readyCallbacks;

// We are using a small mock of jQuery because jQuery is third-party code with
// very well-defined semantics, and we want to confirm that a jQuery stub run
// in a more minimal server environment that implements this behavior will be
// sufficient for Ember's requirements.

QUnit.module('Application readiness', {
  setup() {
    readyWasCalled = 0;
    readyCallbacks = [];

    let jQueryInstance = {
      ready(callback) {
        readyCallbacks.push(callback);
        if (jQuery.isReady) {
          domReady();
        }
      }
    };

    jQuery = function() {
      return jQueryInstance;
    };
    jQuery.isReady = false;

    let domReadyCalled = 0;
    domReady = function() {
      if (domReadyCalled !== 0) { return; }
      domReadyCalled++;
      for (let i = 0; i < readyCallbacks.length; i++) {
        readyCallbacks[i]();
      }
    };

    Application = EmberApplication.extend({
      $: jQuery,

      ready() {
        readyWasCalled++;
      }
    });
  },

  teardown() {
    if (application) {
      run(() => application.destroy());
    }
  }
});

// These tests are confirming that if the callbacks passed into jQuery's ready hook is called
// synchronously during the application's initialization, we get the same behavior as if
// it was triggered after initialization.

QUnit.test('Ember.Application\'s ready event is called right away if jQuery is already ready', function() {
  jQuery.isReady = true;

  run(() => {
    application = Application.create({ router: false });

    equal(readyWasCalled, 0, 'ready is not called until later');
  });

  equal(readyWasCalled, 1, 'ready was called');

  domReady();

  equal(readyWasCalled, 1, 'application\'s ready was not called again');
});

QUnit.test('Ember.Application\'s ready event is called after the document becomes ready', function() {
  run(() => {
    application = Application.create({ router: false });
  });

  equal(readyWasCalled, 0, 'ready wasn\'t called yet');

  domReady();

  equal(readyWasCalled, 1, 'ready was called now that DOM is ready');
});

QUnit.test('Ember.Application\'s ready event can be deferred by other components', function() {
  run(() => {
    application = Application.create({ router: false });
    application.deferReadiness();
  });

  equal(readyWasCalled, 0, 'ready wasn\'t called yet');

  domReady();

  equal(readyWasCalled, 0, 'ready wasn\'t called yet');

  run(() => {
    application.advanceReadiness();
    equal(readyWasCalled, 0);
  });

  equal(readyWasCalled, 1, 'ready was called now all readiness deferrals are advanced');
});

QUnit.test('Ember.Application\'s ready event can be deferred by other components', function() {
  jQuery.isReady = false;

  run(() => {
    application = Application.create({ router: false });
    application.deferReadiness();
    equal(readyWasCalled, 0, 'ready wasn\'t called yet');
  });

  domReady();

  equal(readyWasCalled, 0, 'ready wasn\'t called yet');

  run(() => {
    application.advanceReadiness();
  });

  equal(readyWasCalled, 1, 'ready was called now all readiness deferrals are advanced');

  expectAssertion(() => {
    application.deferReadiness();
  });
});
