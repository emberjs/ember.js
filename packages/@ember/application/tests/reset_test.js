import { run } from '@ember/runloop';
import Controller from '@ember/controller';
import Router from '@ember/routing/router';
import { EventDispatcher } from '@ember/-internals/views';
import { moduleFor, AutobootApplicationTestCase } from 'internal-test-helpers';

moduleFor(
  'Application - resetting',
  class extends AutobootApplicationTestCase {
    ['@test Brings its own run-loop if not provided'](assert) {
      assert.expect(0);
      run(() => this.createApplication());
      this.application.reset();
    }

    ['@test Does not bring its own run loop if one is already provided'](assert) {
      assert.expect(3);

      let didBecomeReady = false;

      run(() => this.createApplication());

      run(() => {
        this.application.ready = () => {
          didBecomeReady = true;
        };

        this.application.reset();

        this.application.deferReadiness();
        assert.ok(!didBecomeReady, 'app is not ready');
      });

      assert.ok(!didBecomeReady, 'app is not ready');
      run(this.application, 'advanceReadiness');
      assert.ok(didBecomeReady, 'app is ready');
    }

    ['@test When an application is reset, new instances of controllers are generated'](assert) {
      run(() => {
        this.createApplication();
        this.add('controller:academic', Controller.extend());
      });

      let firstController = this.applicationInstance.lookup('controller:academic');
      let secondController = this.applicationInstance.lookup('controller:academic');

      this.application.reset();

      let thirdController = this.applicationInstance.lookup('controller:academic');

      assert.strictEqual(
        firstController,
        secondController,
        'controllers looked up in succession should be the same instance'
      );

      assert.ok(
        firstController.isDestroying,
        'controllers are destroyed when their application is reset'
      );

      assert.notStrictEqual(
        firstController,
        thirdController,
        'controllers looked up after the application is reset should not be the same instance'
      );
    }

    ['@test When an application is reset, the eventDispatcher is destroyed and recreated'](assert) {
      let eventDispatcherWasSetup = 0;
      let eventDispatcherWasDestroyed = 0;

      class FakeEventDispatcher extends EventDispatcher {
        setup() {
          eventDispatcherWasSetup++;
        }

        destroy() {
          if (this.isDestroying) {
            return;
          }
          super.destroy();

          eventDispatcherWasDestroyed++;
        }
      }

      run(() => {
        this.createApplication();
        this.add('event_dispatcher:main', FakeEventDispatcher);

        assert.equal(eventDispatcherWasSetup, 0, 'not setup yet');
        assert.equal(eventDispatcherWasDestroyed, 0, 'not destroyed yet');
      });

      assert.equal(eventDispatcherWasSetup, 1, 'setup');
      assert.equal(eventDispatcherWasDestroyed, 0, 'still not destroyed');

      this.application.reset();

      assert.equal(eventDispatcherWasDestroyed, 1, 'destroyed');
      assert.equal(eventDispatcherWasSetup, 2, 'setup called after reset');
    }

    ['@test When an application is reset, the router URL is reset to `/`'](assert) {
      run(() => {
        this.createApplication();

        this.add(
          'router:main',
          Router.extend({
            location: 'none',
          })
        );

        this.router.map(function () {
          this.route('one');
          this.route('two');
        });
      });

      let initialRouter, initialApplicationController;
      return this.visit('/one')
        .then(() => {
          initialApplicationController = this.applicationInstance.lookup('controller:application');
          initialRouter = this.applicationInstance.lookup('router:main');
          let location = initialRouter.get('location');

          assert.equal(location.getURL(), '/one');
          assert.equal(initialRouter.currentPath, 'one');

          this.application.reset();

          return this.application._bootPromise;
        })
        .then(() => {
          let applicationController = this.applicationInstance.lookup('controller:application');
          assert.strictEqual(
            applicationController,
            undefined,
            'application controller no longer exists'
          );

          return this.visit('/one');
        })
        .then(() => {
          let applicationController = this.applicationInstance.lookup('controller:application');
          let router = this.applicationInstance.lookup('router:main');
          let location = router.get('location');

          assert.notEqual(initialRouter, router, 'a different router instance was created');
          assert.notEqual(
            initialApplicationController,
            applicationController,
            'a different application controller is created'
          );

          assert.equal(location.getURL(), '/one');
          assert.equal(router.currentPath, 'one');
        });
    }

    ['@test When an application with advance/deferReadiness is reset, the app does correctly become ready after reset'](
      assert
    ) {
      let readyCallCount = 0;

      run(() => {
        this.createApplication({
          ready() {
            readyCallCount++;
          },
        });

        this.application.deferReadiness();
        assert.equal(readyCallCount, 0, 'ready has not yet been called');
      });

      run(this.application, 'advanceReadiness');

      assert.equal(readyCallCount, 1, 'ready was called once');

      this.application.reset();

      assert.equal(readyCallCount, 2, 'ready was called twice');
    }
  }
);
