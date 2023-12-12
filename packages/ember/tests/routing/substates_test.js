import { RSVP } from '@ember/-internals/runtime';
import Route from '@ember/routing/route';
import Controller from '@ember/controller';
import { service } from '@ember/service';

import { moduleFor, ApplicationTestCase, runTask } from 'internal-test-helpers';

let counter;

function step(assert, expectedValue, description) {
  assert.equal(counter, expectedValue, 'Step ' + expectedValue + ': ' + description);
  counter++;
}

moduleFor(
  'Loading/Error Substates',
  class extends ApplicationTestCase {
    constructor() {
      super(...arguments);
      counter = 1;

      this.addTemplate('application', `<div id="app">{{outlet}}</div>`);
      this.addTemplate('index', 'INDEX');
    }

    visit(...args) {
      return runTask(() => super.visit(...args));
    }

    getController(name) {
      return this.applicationInstance.lookup(`controller:${name}`);
    }

    get currentPath() {
      let currentPath;
      expectDeprecation(() => {
        currentPath = this.getController('application').get('currentPath');
      }, 'Accessing `currentPath` on `controller:application` is deprecated, use the `currentPath` property on `service:router` instead.');
      return currentPath;
    }

    ['@test Slow promise from a child route of application enters nested loading state'](assert) {
      let turtleDeferred = RSVP.defer();

      this.router.map(function () {
        this.route('turtle');
      });

      this.add(
        'route:application',
        Route.extend({
          setupController() {
            step(assert, 2, 'ApplicationRoute#setupController');
          },
        })
      );

      this.add(
        'route:turtle',
        Route.extend({
          model() {
            step(assert, 1, 'TurtleRoute#model');
            return turtleDeferred.promise;
          },
        })
      );
      this.addTemplate('turtle', 'TURTLE');
      this.addTemplate('loading', 'LOADING');

      let promise = this.visit('/turtle').then(() => {
        text = this.$('#app').text();
        assert.equal(
          text,
          'TURTLE',
          `turtle template has loaded and replaced the loading template`
        );
      });

      let text = this.$('#app').text();
      assert.equal(
        text,
        'LOADING',
        `The Loading template is nested in application template's outlet`
      );

      turtleDeferred.resolve();
      return promise;
    }

    [`@test Slow promises returned from ApplicationRoute#model don't enter LoadingRoute`](assert) {
      let appDeferred = RSVP.defer();

      this.add(
        'route:application',
        Route.extend({
          model() {
            return appDeferred.promise;
          },
        })
      );
      this.add(
        'route:loading',
        Route.extend({
          setupController() {
            assert.ok(false, `shouldn't get here`);
          },
        })
      );

      let promise = this.visit('/').then(() => {
        let text = this.$('#app').text();

        assert.equal(text, 'INDEX', `index template has been rendered`);
      });

      if (this.element) {
        assert.equal(this.element.textContent, '');
      }

      appDeferred.resolve();

      return promise;
    }

    [`@test Don't enter loading route unless either route or template defined`](assert) {
      let deferred = RSVP.defer();

      this.router.map(function () {
        this.route('dummy');
      });
      this.add(
        'route:dummy',
        Route.extend({
          model() {
            return deferred.promise;
          },
        })
      );
      this.addTemplate('dummy', 'DUMMY');

      return this.visit('/').then(() => {
        let promise = this.visit('/dummy').then(() => {
          let text = this.$('#app').text();

          assert.equal(text, 'DUMMY', `dummy template has been rendered`);
        });

        assert.ok(
          this.appRouter.currentPath !== 'loading',
          `
        loading state not entered
      `
        );
        deferred.resolve();

        return promise;
      });
    }

    ['@test Enter loading route only if loadingRoute is defined'](assert) {
      let deferred = RSVP.defer();

      this.router.map(function () {
        this.route('dummy');
      });

      this.add(
        'route:dummy',
        Route.extend({
          model() {
            step(assert, 1, 'DummyRoute#model');
            return deferred.promise;
          },
        })
      );
      this.add(
        'route:loading',
        Route.extend({
          setupController() {
            step(assert, 2, 'LoadingRoute#setupController');
          },
        })
      );
      this.addTemplate('dummy', 'DUMMY');

      return this.visit('/').then(() => {
        let promise = this.visit('/dummy').then(() => {
          let text = this.$('#app').text();

          assert.equal(text, 'DUMMY', `dummy template has been rendered`);
        });
        assert.equal(this.appRouter.currentPath, 'loading', `loading state entered`);
        deferred.resolve();

        return promise;
      });
    }

    ['@test Enter loading route with correct query parameters'](assert) {
      let deferred = RSVP.defer();

      this.router.map(function () {
        this.route('dummy');
      });

      this.add(
        'route:dummy',
        Route.extend({
          model() {
            step(assert, 1, 'DummyRoute#model');
            return deferred.promise;
          },
        })
      );

      this.add(
        'controller:application',
        class extends Controller {
          queryParams = ['qux'];

          qux = 'initial';
        }
      );

      this.add(
        'route:loading',
        Route.extend({
          setupController() {
            step(assert, 2, 'LoadingRoute#setupController');
          },
        })
      );
      this.addTemplate('dummy', 'DUMMY');

      return this.visit('/?qux=updated').then(() => {
        assert.equal(
          this.getController('application').qux,
          'updated',
          'the application controller has the correct qp value'
        );

        let promise = this.visit('/dummy?qux=updated').then(() => {
          let text = this.$('#app').text();

          assert.equal(text, 'DUMMY', `dummy template has been rendered`);
          assert.equal(
            this.getController('application').qux,
            'updated',
            'the application controller has the correct qp value'
          );
        });

        assert.equal(this.appRouter.currentPath, 'loading', `loading state entered`);
        assert.equal(
          this.currentURL,
          '/dummy?qux=updated',
          `during loading url reflect the correct state`
        );
        assert.equal(
          this.getController('application').qux,
          'updated',
          'the application controller has the correct qp value'
        );

        deferred.resolve();

        return promise;
      });
    }

    ['@test Enter child-loading route with correct query parameters'](assert) {
      assert.expect(8);
      let deferred = RSVP.defer();

      this.router.map(function () {
        this.route('parent', function () {
          this.route('child');
        });
      });

      this.add(
        'route:parent.child',
        Route.extend({
          model() {
            step(assert, 1, 'ChildRoute#model');
            return deferred.promise;
          },
        })
      );

      this.add(
        'controller:parent',
        class extends Controller {
          queryParams = ['qux'];

          qux = 'initial';
        }
      );

      this.add(
        'route:parent.child_loading',
        Route.extend({
          setupController() {
            step(assert, 2, 'ChildLoadingRoute#setupController');
          },
        })
      );
      this.addTemplate('parent', 'PARENT {{outlet}}');

      this.addTemplate('parent.child', 'CHILD');

      return this.visit('/parent?qux=updated').then(() => {
        assert.equal(
          this.getController('parent').qux,
          'updated',
          'in the parent route, the parent controller has the correct qp value'
        );

        let promise = this.visit('/parent/child?qux=updated').then(() => {
          let text = this.$('#app').text();

          assert.equal(text, 'PARENT CHILD', `child template has been rendered`);
          assert.equal(
            this.getController('parent').qux,
            'updated',
            'after entered in the parent.child route, the parent controller has the correct qp value'
          );
        });

        assert.equal(
          this.appRouter.currentPath,
          'parent.child_loading',
          `child loading state entered`
        );

        assert.equal(
          this.currentURL,
          '/parent/child?qux=updated',
          `during child loading, url reflect the correct state`
        );

        assert.equal(
          this.getController('parent').qux,
          'updated',
          'in the child_loading route, the parent controller has the correct qp value'
        );

        deferred.resolve();

        return promise;
      });
    }

    ['@test Slow promises returned from ApplicationRoute#model enter ApplicationLoadingRoute if present'](
      assert
    ) {
      let appDeferred = RSVP.defer();

      this.add(
        'route:application',
        Route.extend({
          model() {
            return appDeferred.promise;
          },
        })
      );
      let loadingRouteEntered = false;
      this.add(
        'route:application_loading',
        Route.extend({
          setupController() {
            loadingRouteEntered = true;
          },
        })
      );

      let promise = this.visit('/').then(() => {
        assert.equal(this.$('#app').text(), 'INDEX', 'index route loaded');
      });
      assert.ok(loadingRouteEntered, 'ApplicationLoadingRoute was entered');
      appDeferred.resolve();

      return promise;
    }

    ['@test Slow promises returned from ApplicationRoute#model enter application_loading if template present'](
      assert
    ) {
      let appDeferred = RSVP.defer();

      this.addTemplate(
        'application_loading',
        `
      <div id="toplevel-loading">TOPLEVEL LOADING</div>
    `
      );
      this.add(
        'route:application',
        Route.extend({
          model() {
            return appDeferred.promise;
          },
        })
      );

      let promise = this.visit('/').then(() => {
        let length = this.$('#toplevel-loading').length;
        text = this.$('#app').text();

        assert.equal(length, 0, `top-level loading view has been entirely removed from the DOM`);
        assert.equal(text, 'INDEX', 'index has fully rendered');
      });
      let text = this.$('#toplevel-loading').text();

      assert.equal(text, 'TOPLEVEL LOADING', 'still loading the top level');
      appDeferred.resolve();

      return promise;
    }

    ['@test Prioritized substate entry works with preserved-namespace nested routes'](assert) {
      let deferred = RSVP.defer();

      this.addTemplate('foo.bar_loading', 'FOOBAR LOADING');
      this.addTemplate('foo.bar.index', 'YAY');

      this.router.map(function () {
        this.route('foo', function () {
          this.route('bar', { path: '/bar' }, function () {});
        });
      });

      this.add(
        'route:foo.bar',
        Route.extend({
          model() {
            return deferred.promise;
          },
        })
      );

      return this.visit('/').then(() => {
        let promise = this.visit('/foo/bar').then(() => {
          text = this.$('#app').text();

          assert.equal(text, 'YAY', 'foo.bar.index fully loaded');
        });
        let text = this.$('#app').text();

        assert.equal(
          text,
          'FOOBAR LOADING',
          `foo.bar_loading was entered (as opposed to something like foo/foo/bar_loading)`
        );
        deferred.resolve();

        return promise;
      });
    }

    ['@test Prioritized substate entry works with reset-namespace nested routes'](assert) {
      let deferred = RSVP.defer();

      this.addTemplate('bar_loading', 'BAR LOADING');
      this.addTemplate('bar.index', 'YAY');

      this.router.map(function () {
        this.route('foo', function () {
          this.route('bar', { path: '/bar', resetNamespace: true }, function () {});
        });
      });

      this.add(
        'route:bar',
        Route.extend({
          model() {
            return deferred.promise;
          },
        })
      );

      return this.visit('/').then(() => {
        let promise = this.visit('/foo/bar').then(() => {
          text = this.$('#app').text();

          assert.equal(text, 'YAY', 'bar.index fully loaded');
        });

        let text = this.$('#app').text();

        assert.equal(
          text,
          'BAR LOADING',
          `foo.bar_loading was entered (as opposed to something likefoo/foo/bar_loading)`
        );
        deferred.resolve();

        return promise;
      });
    }

    ['@test Prioritized loading substate entry works with preserved-namespace nested routes'](
      assert
    ) {
      let deferred = RSVP.defer();

      this.addTemplate('foo.bar_loading', 'FOOBAR LOADING');
      this.addTemplate('foo.bar', 'YAY');

      this.router.map(function () {
        this.route('foo', function () {
          this.route('bar');
        });
      });

      this.add(
        'route:foo.bar',
        Route.extend({
          model() {
            return deferred.promise;
          },
        })
      );

      let promise = this.visit('/foo/bar').then(() => {
        text = this.$('#app').text();

        assert.equal(text, 'YAY', 'foo.bar has rendered');
      });
      let text = this.$('#app').text();

      assert.equal(
        text,
        'FOOBAR LOADING',
        `foo.bar_loading was entered (as opposed to something like foo/foo/bar_loading)`
      );
      deferred.resolve();

      return promise;
    }

    async ['@test Prioritized error substate entry works with preserved-namespace nested routes'](
      assert
    ) {
      this.addTemplate('foo.bar_error', 'FOOBAR ERROR: {{@model.msg}}');
      this.addTemplate('foo.bar', 'YAY');

      this.router.map(function () {
        this.route('foo', function () {
          this.route('bar');
        });
      });

      this.add(
        'route:foo.bar',
        Route.extend({
          model() {
            return RSVP.reject({
              msg: 'did it broke?',
            });
          },
        })
      );

      await this.visit('/');

      await this.visit('/foo/bar');

      assert.equal(
        this.$('#app').text(),
        'FOOBAR ERROR: did it broke?',
        `foo.bar_error was entered (as opposed to something like foo/foo/bar_error)`
      );
    }

    ['@test Prioritized loading substate entry works with auto-generated index routes'](assert) {
      let deferred = RSVP.defer();
      this.addTemplate('foo.index_loading', 'FOO LOADING');
      this.addTemplate('foo.index', 'YAY');
      this.addTemplate('foo', '{{outlet}}');

      this.router.map(function () {
        this.route('foo', function () {
          this.route('bar');
        });
      });

      this.add(
        'route:foo.index',
        Route.extend({
          model() {
            return deferred.promise;
          },
        })
      );
      this.add(
        'route:foo',
        Route.extend({
          model() {
            return true;
          },
        })
      );

      let promise = this.visit('/foo').then(() => {
        text = this.$('#app').text();

        assert.equal(text, 'YAY', 'foo.index was rendered');
      });
      let text = this.$('#app').text();
      assert.equal(text, 'FOO LOADING', 'foo.index_loading was entered');

      deferred.resolve();

      return promise;
    }

    async ['@test Prioritized error substate entry works with auto-generated index routes'](
      assert
    ) {
      this.addTemplate('foo.index_error', 'FOO ERROR: {{@model.msg}}');
      this.addTemplate('foo.index', 'YAY');
      this.addTemplate('foo', '{{outlet}}');

      this.router.map(function () {
        this.route('foo', function () {
          this.route('bar');
        });
      });

      this.add(
        'route:foo.index',
        Route.extend({
          model() {
            return RSVP.reject({
              msg: 'did it broke?',
            });
          },
        })
      );
      this.add(
        'route:foo',
        Route.extend({
          model() {
            return true;
          },
        })
      );

      await this.visit('/');

      await this.visit('/foo');

      assert.equal(
        this.$('#app').text(),
        'FOO ERROR: did it broke?',
        'foo.index_error was entered'
      );
    }

    async ['@test Rejected promises returned from ApplicationRoute transition into top-level application_error'](
      assert
    ) {
      let reject = true;

      this.addTemplate('index', '<div id="index">INDEX</div>');
      this.add(
        'route:application',
        Route.extend({
          init() {
            this._super(...arguments);
          },
          model() {
            if (reject) {
              return RSVP.reject({ msg: 'BAD NEWS BEARS' });
            } else {
              return {};
            }
          },
        })
      );

      this.addTemplate(
        'application_error',
        `<p id="toplevel-error">TOPLEVEL ERROR: {{@model.msg}}</p>`
      );

      await this.visit('/');

      assert.equal(
        this.$('#toplevel-error').text(),
        'TOPLEVEL ERROR: BAD NEWS BEARS',
        'toplevel error rendered'
      );

      reject = false;

      await this.visit('/');

      assert.equal(this.$('#index').text(), 'INDEX', 'the index route resolved');
    }
  }
);

moduleFor(
  'Loading/Error Substates - nested routes',
  class extends ApplicationTestCase {
    constructor() {
      super(...arguments);

      counter = 1;

      this.addTemplate('application', `<div id="app">{{outlet}}</div>`);
      this.addTemplate('index', 'INDEX');
      this.addTemplate('grandma', 'GRANDMA {{outlet}}');
      this.addTemplate('mom', 'MOM');

      this.router.map(function () {
        this.route('grandma', function () {
          this.route('mom', { resetNamespace: true }, function () {
            this.route('sally');
            this.route('this-route-throws');
          });
          this.route('puppies');
        });
        this.route('memere', { path: '/memere/:seg' }, function () {});
      });
    }

    getController(name) {
      return this.applicationInstance.lookup(`controller:${name}`);
    }

    async ['@test ApplicationRoute#currentPath reflects loading state path'](assert) {
      await this.visit('/');

      let momDeferred = RSVP.defer();

      this.addTemplate('grandma.loading', 'GRANDMALOADING');

      this.add(
        'route:mom',
        Route.extend({
          model() {
            return momDeferred.promise;
          },
        })
      );

      let promise = runTask(() => this.visit('/grandma/mom')).then(() => {
        text = this.$('#app').text();

        assert.equal(text, 'GRANDMA MOM', `Grandma.mom loaded text is displayed`);
        assert.equal(
          this.appRouter.currentPath,
          'grandma.mom.index',
          `currentPath reflects final state`
        );
      });
      let text = this.$('#app').text();

      assert.equal(text, 'GRANDMA GRANDMALOADING', `Grandma.mom loading text displayed`);

      assert.equal(
        this.appRouter.currentPath,
        'grandma.loading',
        `currentPath reflects loading state`
      );

      momDeferred.resolve();

      return promise;
    }

    async [`@test Loading actions bubble to root but don't enter substates above pivot `](assert) {
      await this.visit('/');

      let sallyDeferred = RSVP.defer();
      let puppiesDeferred = RSVP.defer();

      this.add(
        'route:application',
        Route.extend({
          actions: {
            loading() {
              assert.ok(true, 'loading action received on ApplicationRoute');
            },
          },
        })
      );

      this.add(
        'route:mom.sally',
        Route.extend({
          model() {
            return sallyDeferred.promise;
          },
        })
      );

      this.add(
        'route:grandma.puppies',
        Route.extend({
          model() {
            return puppiesDeferred.promise;
          },
        })
      );

      let promise = this.visit('/grandma/mom/sally');
      assert.equal(this.appRouter.currentPath, 'index', 'Initial route fully loaded');

      sallyDeferred.resolve();

      promise
        .then(() => {
          assert.equal(this.appRouter.currentPath, 'grandma.mom.sally', 'transition completed');

          let visit = this.visit('/grandma/puppies');
          assert.equal(
            this.appRouter.currentPath,
            'grandma.mom.sally',
            'still in initial state because the only loading state is above the pivot route'
          );

          return visit;
        })
        .then(() => {
          runTask(() => puppiesDeferred.resolve());

          assert.equal(this.appRouter.currentPath, 'grandma.puppies', 'Finished transition');
        });

      return promise;
    }

    async ['@test Default error event moves into nested route'](assert) {
      await this.visit('/');

      this.addTemplate('grandma.error', 'ERROR: {{@model.msg}}');

      this.add(
        'route:mom.sally',
        Route.extend({
          model() {
            step(assert, 1, 'MomSallyRoute#model');
            return RSVP.reject({
              msg: 'did it broke?',
            });
          },
          actions: {
            error() {
              step(assert, 2, 'MomSallyRoute#actions.error');
              return true;
            },
          },
        })
      );

      await this.visit('/grandma/mom/sally');

      step(assert, 3, 'App finished loading');

      assert.equal(this.$('#app').text(), 'GRANDMA ERROR: did it broke?', 'error bubbles');
      assert.equal(this.appRouter.currentPath, 'grandma.error', 'Initial route fully loaded');
    }

    async [`@test Non-bubbled errors that re-throw aren't swallowed`](assert) {
      await this.visit('/');

      this.add(
        'route:mom.sally',
        Route.extend({
          model() {
            return RSVP.reject({
              msg: 'did it broke?',
            });
          },
          actions: {
            error(err) {
              // returns undefined which is falsey
              throw err;
            },
          },
        })
      );

      await assert.rejects(
        this.visit('/grandma/mom/sally'),
        function (err) {
          return err.msg === 'did it broke?';
        },
        'it broke'
      );
    }

    async [`@test Handled errors that re-throw aren't swallowed`](assert) {
      await this.visit('/');

      let handledError;

      this.add(
        'route:mom.sally',
        Route.extend({
          router: service(),
          model() {
            step(assert, 1, 'MomSallyRoute#model');
            return RSVP.reject({
              msg: 'did it broke?',
            });
          },
          actions: {
            error(err) {
              step(assert, 2, 'MomSallyRoute#actions.error');
              handledError = err;
              this.router.transitionTo('mom.this-route-throws');

              return false;
            },
          },
        })
      );

      this.add(
        'route:mom.this-route-throws',
        Route.extend({
          model() {
            step(assert, 3, 'MomThisRouteThrows#model');
            throw handledError;
          },
        })
      );

      await assert.rejects(
        this.visit('/grandma/mom/sally'),
        function (err) {
          return err.msg === 'did it broke?';
        },
        `it broke`
      );
    }

    async ['@test errors that are bubbled are thrown at a higher level if not handled'](assert) {
      await this.visit('/');

      this.add(
        'route:mom.sally',
        Route.extend({
          model() {
            step(assert, 1, 'MomSallyRoute#model');
            return RSVP.reject({
              msg: 'did it broke?',
            });
          },
          actions: {
            error() {
              step(assert, 2, 'MomSallyRoute#actions.error');
              return true;
            },
          },
        })
      );

      await assert.rejects(
        this.visit('/grandma/mom/sally'),
        function (err) {
          return err.msg == 'did it broke?';
        },
        'Correct error was thrown'
      );
    }

    async [`@test Handled errors that are thrown through rejection aren't swallowed`](assert) {
      await this.visit('/');

      let handledError;

      this.add(
        'route:mom.sally',
        Route.extend({
          router: service(),
          model() {
            step(assert, 1, 'MomSallyRoute#model');
            return RSVP.reject({
              msg: 'did it broke?',
            });
          },
          actions: {
            error(err) {
              step(assert, 2, 'MomSallyRoute#actions.error');
              handledError = err;
              this.router.transitionTo('mom.this-route-throws');

              return false;
            },
          },
        })
      );

      this.add(
        'route:mom.this-route-throws',
        Route.extend({
          model() {
            step(assert, 3, 'MomThisRouteThrows#model');
            return RSVP.reject(handledError);
          },
        })
      );

      await assert.rejects(
        this.visit('/grandma/mom/sally'),
        function (err) {
          return err.msg === 'did it broke?';
        },
        'it broke'
      );
    }

    async ['@test Default error events move into nested route, prioritizing more specifically named error routes - NEW'](
      assert
    ) {
      await this.visit('/');

      this.addTemplate('grandma.error', 'ERROR: {{@model.msg}}');
      this.addTemplate('mom_error', 'MOM ERROR: {{@model.msg}}');

      this.add(
        'route:mom.sally',
        Route.extend({
          model() {
            step(assert, 1, 'MomSallyRoute#model');
            return RSVP.reject({
              msg: 'did it broke?',
            });
          },
          actions: {
            error() {
              step(assert, 2, 'MomSallyRoute#actions.error');
              return true;
            },
          },
        })
      );

      await this.visit('/grandma/mom/sally');

      step(assert, 3, 'Application finished booting');

      assert.equal(
        this.$('#app').text(),
        'GRANDMA MOM ERROR: did it broke?',
        'the more specifically named mome error substate was entered over the other error route'
      );

      assert.equal(this.appRouter.currentPath, 'grandma.mom_error', 'Initial route fully loaded');
    }

    async ['@test Slow promises waterfall on startup'](assert) {
      await this.visit('/');

      let grandmaDeferred = RSVP.defer();
      let sallyDeferred = RSVP.defer();

      this.addTemplate('loading', 'LOADING');
      this.addTemplate('mom', 'MOM {{outlet}}');
      this.addTemplate('mom.loading', 'MOMLOADING');
      this.addTemplate('mom.sally', 'SALLY');

      this.add(
        'route:grandma',
        Route.extend({
          model() {
            step(assert, 1, 'GrandmaRoute#model');
            return grandmaDeferred.promise;
          },
        })
      );

      this.add(
        'route:mom',
        Route.extend({
          model() {
            step(assert, 2, 'MomRoute#model');
            return {};
          },
        })
      );

      this.add(
        'route:mom.sally',
        Route.extend({
          model() {
            step(assert, 3, 'SallyRoute#model');
            return sallyDeferred.promise;
          },
          setupController() {
            step(assert, 4, 'SallyRoute#setupController');
          },
        })
      );

      let promise = runTask(() => this.visit('/grandma/mom/sally')).then(() => {
        text = this.$('#app').text();

        assert.equal(text, 'GRANDMA MOM SALLY', `Sally template displayed`);
      });
      let text = this.$('#app').text();

      assert.equal(
        text,
        'LOADING',
        `The loading template is nested in application template's outlet`
      );

      runTask(() => grandmaDeferred.resolve());
      text = this.$('#app').text();

      assert.equal(
        text,
        'GRANDMA MOM MOMLOADING',
        `Mom's child loading route is displayed due to sally's slow promise`
      );

      sallyDeferred.resolve();

      return promise;
    }

    async ['@test Enter child loading state of pivot route'](assert) {
      await this.visit('/');

      let deferred = RSVP.defer();
      this.addTemplate('grandma.loading', 'GMONEYLOADING');

      this.add(
        'route:mom.sally',
        Route.extend({
          setupController() {
            step(assert, 1, 'SallyRoute#setupController');
          },
        })
      );

      this.add(
        'route:grandma.puppies',
        Route.extend({
          model() {
            return deferred.promise;
          },
        })
      );

      await this.visit('/grandma/mom/sally');
      assert.equal(this.appRouter.currentPath, 'grandma.mom.sally', 'Initial route fully loaded');

      let promise = runTask(() => this.visit('/grandma/puppies')).then(() => {
        assert.equal(this.appRouter.currentPath, 'grandma.puppies', 'Finished transition');
      });

      assert.equal(
        this.appRouter.currentPath,
        'grandma.loading',
        `in pivot route's child loading state`
      );

      deferred.resolve();

      return promise;
    }

    async [`@test Error events that aren't bubbled don't throw application assertions`](assert) {
      await this.visit('/');

      this.add(
        'route:mom.sally',
        Route.extend({
          model() {
            step(assert, 1, 'MomSallyRoute#model');
            return RSVP.reject({
              msg: 'did it broke?',
            });
          },
          actions: {
            error(err) {
              step(assert, 2, 'MomSallyRoute#actions.error');
              assert.equal(err.msg, 'did it broke?', `it didn't break`);
              return false;
            },
          },
        })
      );

      return this.visit('/grandma/mom/sally');
    }

    ['@test Handled errors that bubble can be handled at a higher level'](assert) {
      let handledError;

      this.add(
        'route:mom',
        Route.extend({
          actions: {
            error(err) {
              step(assert, 3, 'MomRoute#actions.error');
              assert.equal(
                err,
                handledError,
                `error handled and rebubbled is handleable at higher route`
              );
            },
          },
        })
      );

      this.add(
        'route:mom.sally',
        Route.extend({
          model() {
            step(assert, 1, 'MomSallyRoute#model');
            return RSVP.reject({
              msg: 'did it broke?',
            });
          },
          actions: {
            error(err) {
              step(assert, 2, 'MomSallyRoute#actions.error');
              handledError = err;

              return true;
            },
          },
        })
      );

      return this.visit('/grandma/mom/sally');
    }

    async ['@test Setting a query param during a slow transition should work'](assert) {
      await this.visit('/');

      let deferred = RSVP.defer();
      this.addTemplate('memere.loading', 'MMONEYLOADING');

      this.add(
        'route:grandma',
        Route.extend({
          router: service(),
          beforeModel: function () {
            this.router.transitionTo('memere', 1);
          },
        })
      );

      this.add(
        'route:memere',
        Route.extend({
          queryParams: {
            test: { defaultValue: 1 },
          },
        })
      );

      this.add(
        'route:memere.index',
        Route.extend({
          model() {
            return deferred.promise;
          },
        })
      );

      let promise = runTask(() => this.visit('/grandma')).then(() => {
        assert.equal(this.appRouter.currentPath, 'memere.index', 'Transition should be complete');
      });
      let memereController = this.getController('memere');

      assert.equal(this.appRouter.currentPath, 'memere.loading', 'Initial route should be loading');

      memereController.set('test', 3);

      assert.equal(
        this.appRouter.currentPath,
        'memere.loading',
        'Initial route should still be loading'
      );

      assert.equal(
        memereController.get('test'),
        3,
        'Controller query param value should have changed'
      );
      deferred.resolve();

      return promise;
    }
  }
);
