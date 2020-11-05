import Controller from '@ember/controller';
import { dasherize } from '@ember/string';
import { RSVP, Object as EmberObject, A as emberA } from '@ember/-internals/runtime';
import { run } from '@ember/runloop';
import { peekMeta } from '@ember/-internals/meta';
import { get, computed, tracked } from '@ember/-internals/metal';
import { Route } from '@ember/-internals/routing';
import { PARAMS_SYMBOL } from 'router_js';

import { QueryParamTestCase, moduleFor, getTextOf, runLoopSettled } from 'internal-test-helpers';

moduleFor(
  'Query Params - main',
  class extends QueryParamTestCase {
    async refreshModelWhileLoadingTest(loadingReturn) {
      let assert = this.assert;

      assert.expect(9);

      let appModelCount = 0;
      let promiseResolve;

      this.add(
        'route:application',
        Route.extend({
          queryParams: {
            appomg: {
              defaultValue: 'applol',
            },
          },
          model(/* params */) {
            appModelCount++;
          },
        })
      );

      this.setSingleQPController('index', 'omg', undefined, {
        omg: undefined,
      });

      let actionName = typeof loadingReturn !== 'undefined' ? 'loading' : 'ignore';
      let indexModelCount = 0;
      this.add(
        'route:index',
        Route.extend({
          queryParams: {
            omg: {
              refreshModel: true,
            },
          },
          actions: {
            [actionName]: function () {
              return loadingReturn;
            },
          },
          model(params) {
            indexModelCount++;
            if (indexModelCount === 2) {
              assert.deepEqual(params, { omg: 'lex' });
              return new RSVP.Promise(function (resolve) {
                promiseResolve = resolve;
                return;
              });
            } else if (indexModelCount === 3) {
              assert.deepEqual(
                params,
                { omg: 'hello' },
                "Model hook reruns even if the previous one didn't finish"
              );
            }
          },
        })
      );

      await this.visit('/');
      assert.equal(appModelCount, 1, 'appModelCount is 1');
      assert.equal(indexModelCount, 1);

      let indexController = this.getController('index');
      await this.setAndFlush(indexController, 'omg', 'lex');

      assert.equal(appModelCount, 1, 'appModelCount is 1');
      assert.equal(indexModelCount, 2);

      await this.setAndFlush(indexController, 'omg', 'hello');
      assert.equal(appModelCount, 1, 'appModelCount is 1');
      assert.equal(indexModelCount, 3);

      run(function () {
        promiseResolve();
      });

      assert.equal(get(indexController, 'omg'), 'hello', 'At the end last value prevails');
    }

    ["@test No replaceURL occurs on startup because default values don't show up in URL"](assert) {
      assert.expect(1);

      this.setSingleQPController('index');

      return this.visitAndAssert('/');
    }

    ['@test Calling transitionTo does not lose query params already on the activeTransition'](
      assert
    ) {
      assert.expect(2);

      this.router.map(function () {
        this.route('parent', function () {
          this.route('child');
          this.route('sibling');
        });
      });

      this.add(
        'route:parent.child',
        Route.extend({
          afterModel() {
            this.transitionTo('parent.sibling');
          },
        })
      );

      this.setSingleQPController('parent');

      return this.visit('/parent/child?foo=lol').then(() => {
        this.assertCurrentPath(
          '/parent/sibling?foo=lol',
          'redirected to the sibling route, instead of child route'
        );
        assert.equal(
          this.getController('parent').get('foo'),
          'lol',
          'controller has value from the active transition'
        );
      });
    }

    async ['@test Single query params can be set on the controller and reflected in the url'](
      assert
    ) {
      assert.expect(3);

      this.router.map(function () {
        this.route('home', { path: '/' });
      });

      this.setSingleQPController('home');

      await this.visitAndAssert('/');
      let controller = this.getController('home');

      await this.setAndFlush(controller, 'foo', '456');
      this.assertCurrentPath('/?foo=456');

      await this.setAndFlush(controller, 'foo', '987');
      this.assertCurrentPath('/?foo=987');
    }

    async ['@test Query params can map to different url keys configured on the controller'](
      assert
    ) {
      assert.expect(6);

      this.add(
        'controller:index',
        Controller.extend({
          queryParams: [{ foo: 'other_foo', bar: { as: 'other_bar' } }],
          foo: 'FOO',
          bar: 'BAR',
        })
      );

      await this.visitAndAssert('/');
      let controller = this.getController('index');

      await this.setAndFlush(controller, 'foo', 'LEX');
      this.assertCurrentPath('/?other_foo=LEX', "QP mapped correctly without 'as'");

      await this.setAndFlush(controller, 'foo', 'WOO');
      this.assertCurrentPath('/?other_foo=WOO', "QP updated correctly without 'as'");

      this.transitionTo('/?other_foo=NAW');
      assert.equal(controller.get('foo'), 'NAW', 'QP managed correctly on URL transition');

      await this.setAndFlush(controller, 'bar', 'NERK');
      this.assertCurrentPath('/?other_bar=NERK&other_foo=NAW', "QP mapped correctly with 'as'");

      await this.setAndFlush(controller, 'bar', 'NUKE');
      this.assertCurrentPath('/?other_bar=NUKE&other_foo=NAW', "QP updated correctly with 'as'");
    }

    async ['@test Routes have a private overridable serializeQueryParamKey hook'](assert) {
      assert.expect(2);

      this.add(
        'route:index',
        Route.extend({
          serializeQueryParamKey: dasherize,
        })
      );

      this.setSingleQPController('index', 'funTimes', '');

      await this.visitAndAssert('/');
      let controller = this.getController('index');

      await this.setAndFlush(controller, 'funTimes', 'woot');
      this.assertCurrentPath('/?fun-times=woot');
    }

    async ['@test Can override inherited QP behavior by specifying queryParams as a computed property'](
      assert
    ) {
      assert.expect(3);

      this.setSingleQPController('index', 'a', 0, {
        queryParams: computed(function () {
          return ['c'];
        }),
        c: true,
      });

      await this.visitAndAssert('/');
      let indexController = this.getController('index');

      await this.setAndFlush(indexController, 'a', 1);
      this.assertCurrentPath('/', 'QP did not update due to being overriden');

      await this.setAndFlush(indexController, 'c', false);
      this.assertCurrentPath('/?c=false', 'QP updated with overridden param');
    }

    async ['@test Can concatenate inherited QP behavior by specifying queryParams as an array'](
      assert
    ) {
      assert.expect(3);

      this.setSingleQPController('index', 'a', 0, {
        queryParams: ['c'],
        c: true,
      });

      await this.visitAndAssert('/');
      let indexController = this.getController('index');

      await this.setAndFlush(indexController, 'a', 1);
      this.assertCurrentPath('/?a=1', 'Inherited QP did update');

      await this.setAndFlush(indexController, 'c', false);
      this.assertCurrentPath('/?a=1&c=false', 'New QP did update');
    }

    ['@test model hooks receives query params'](assert) {
      assert.expect(2);

      this.setSingleQPController('index');

      this.add(
        'route:index',
        Route.extend({
          model(params) {
            assert.deepEqual(params, { foo: 'bar' });
          },
        })
      );

      return this.visitAndAssert('/');
    }

    ['@test model hooks receives query params with dynamic segment params'](assert) {
      assert.expect(2);

      this.router.map(function () {
        this.route('index', { path: '/:id' });
      });

      this.setSingleQPController('index');

      this.add(
        'route:index',
        Route.extend({
          model(params) {
            assert.deepEqual(params, { foo: 'bar', id: 'baz' });
          },
        })
      );

      return this.visitAndAssert('/baz');
    }

    ['@test model hooks receives query params (overridden by incoming url value)'](assert) {
      assert.expect(2);

      this.router.map(function () {
        this.route('index', { path: '/:id' });
      });

      this.setSingleQPController('index');

      this.add(
        'route:index',
        Route.extend({
          model(params) {
            assert.deepEqual(params, { foo: 'baz', id: 'boo' });
          },
        })
      );

      return this.visitAndAssert('/boo?foo=baz');
    }

    async ['@test error is thrown if dynamic segment and query param have same name'](assert) {
      this.router.map(function () {
        this.route('index', { path: '/:foo' });
      });

      this.setSingleQPController('index');

      await assert.rejectsAssertion(
        this.visitAndAssert('/boo?foo=baz'),
        `The route 'index' has both a dynamic segment and query param with name 'foo'. Please rename one to avoid collisions.`
      );
    }

    ['@test query params have been set by the time setupController is called'](assert) {
      assert.expect(2);

      this.setSingleQPController('application');

      this.add(
        'route:application',
        Route.extend({
          setupController(controller) {
            assert.equal(
              controller.get('foo'),
              'YEAH',
              "controller's foo QP property set before setupController called"
            );
          },
        })
      );

      return this.visitAndAssert('/?foo=YEAH');
    }

    ['@test mapped query params have been set by the time setupController is called'](assert) {
      assert.expect(2);

      this.setSingleQPController('application', { faz: 'foo' });

      this.add(
        'route:application',
        Route.extend({
          setupController(controller) {
            assert.equal(
              controller.get('faz'),
              'YEAH',
              "controller's foo QP property set before setupController called"
            );
          },
        })
      );

      return this.visitAndAssert('/?foo=YEAH');
    }

    ['@test Route#paramsFor fetches query params with default value'](assert) {
      assert.expect(2);

      this.router.map(function () {
        this.route('index', { path: '/:something' });
      });

      this.setSingleQPController('index');

      this.add(
        'route:index',
        Route.extend({
          model(/* params, transition */) {
            assert.deepEqual(
              this.paramsFor('index'),
              { something: 'baz', foo: 'bar' },
              'could retrieve params for index'
            );
          },
        })
      );

      return this.visitAndAssert('/baz');
    }

    ['@test Route#paramsFor fetches query params with non-default value'](assert) {
      assert.expect(2);

      this.router.map(function () {
        this.route('index', { path: '/:something' });
      });

      this.setSingleQPController('index');

      this.add(
        'route:index',
        Route.extend({
          model(/* params, transition */) {
            assert.deepEqual(
              this.paramsFor('index'),
              { something: 'baz', foo: 'boo' },
              'could retrieve params for index'
            );
          },
        })
      );

      return this.visitAndAssert('/baz?foo=boo');
    }

    ['@test Route#paramsFor fetches default falsy query params'](assert) {
      assert.expect(2);

      this.router.map(function () {
        this.route('index', { path: '/:something' });
      });

      this.setSingleQPController('index', 'foo', false);

      this.add(
        'route:index',
        Route.extend({
          model(/* params, transition */) {
            assert.deepEqual(
              this.paramsFor('index'),
              { something: 'baz', foo: false },
              'could retrieve params for index'
            );
          },
        })
      );

      return this.visitAndAssert('/baz');
    }

    ['@test Route#paramsFor fetches non-default falsy query params'](assert) {
      assert.expect(2);

      this.router.map(function () {
        this.route('index', { path: '/:something' });
      });

      this.setSingleQPController('index', 'foo', true);

      this.add(
        'route:index',
        Route.extend({
          model(/* params, transition */) {
            assert.deepEqual(
              this.paramsFor('index'),
              { something: 'baz', foo: false },
              'could retrieve params for index'
            );
          },
        })
      );

      return this.visitAndAssert('/baz?foo=false');
    }

    ['@test model hook can query prefix-less application params'](assert) {
      assert.expect(4);

      this.setSingleQPController('application', 'appomg', 'applol');
      this.setSingleQPController('index', 'omg', 'lol');

      this.add(
        'route:application',
        Route.extend({
          model(params) {
            assert.deepEqual(params, { appomg: 'applol' });
          },
        })
      );

      this.add(
        'route:index',
        Route.extend({
          model(params) {
            assert.deepEqual(params, { omg: 'lol' });
            assert.deepEqual(this.paramsFor('application'), {
              appomg: 'applol',
            });
          },
        })
      );

      return this.visitAndAssert('/');
    }

    ['@test model hook can query prefix-less application params (overridden by incoming url value)'](
      assert
    ) {
      assert.expect(4);

      this.setSingleQPController('application', 'appomg', 'applol');
      this.setSingleQPController('index', 'omg', 'lol');

      this.add(
        'route:application',
        Route.extend({
          model(params) {
            assert.deepEqual(params, { appomg: 'appyes' });
          },
        })
      );

      this.add(
        'route:index',
        Route.extend({
          model(params) {
            assert.deepEqual(params, { omg: 'yes' });
            assert.deepEqual(this.paramsFor('application'), {
              appomg: 'appyes',
            });
          },
        })
      );

      return this.visitAndAssert('/?appomg=appyes&omg=yes');
    }

    async ['@test can opt into full transition by setting refreshModel in route queryParams'](
      assert
    ) {
      assert.expect(7);

      this.setSingleQPController('application', 'appomg', 'applol');
      this.setSingleQPController('index', 'omg', 'lol');

      let appModelCount = 0;
      this.add(
        'route:application',
        Route.extend({
          model(/* params, transition */) {
            appModelCount++;
          },
        })
      );

      let indexModelCount = 0;
      this.add(
        'route:index',
        Route.extend({
          queryParams: {
            omg: {
              refreshModel: true,
            },
          },
          model(params) {
            indexModelCount++;

            if (indexModelCount === 1) {
              assert.deepEqual(params, { omg: 'lol' }, 'params are correct on first pass');
            } else if (indexModelCount === 2) {
              assert.deepEqual(params, { omg: 'lex' }, 'params are correct on second pass');
            }
          },
        })
      );

      await this.visitAndAssert('/');
      assert.equal(appModelCount, 1, 'app model hook ran');
      assert.equal(indexModelCount, 1, 'index model hook ran');

      let indexController = this.getController('index');
      await this.setAndFlush(indexController, 'omg', 'lex');

      assert.equal(appModelCount, 1, 'app model hook did not run again');
      assert.equal(indexModelCount, 2, 'index model hook ran again due to refreshModel');
    }

    async ['@test refreshModel and replace work together'](assert) {
      assert.expect(8);

      this.setSingleQPController('application', 'appomg', 'applol');
      this.setSingleQPController('index', 'omg', 'lol');

      let appModelCount = 0;
      this.add(
        'route:application',
        Route.extend({
          model(/* params */) {
            appModelCount++;
          },
        })
      );

      let indexModelCount = 0;
      this.add(
        'route:index',
        Route.extend({
          queryParams: {
            omg: {
              refreshModel: true,
              replace: true,
            },
          },
          model(params) {
            indexModelCount++;

            if (indexModelCount === 1) {
              assert.deepEqual(params, { omg: 'lol' }, 'params are correct on first pass');
            } else if (indexModelCount === 2) {
              assert.deepEqual(params, { omg: 'lex' }, 'params are correct on second pass');
            }
          },
        })
      );

      await this.visitAndAssert('/');
      assert.equal(appModelCount, 1, 'app model hook ran');
      assert.equal(indexModelCount, 1, 'index model hook ran');

      let indexController = this.getController('index');
      this.expectedReplaceURL = '/?omg=lex';
      await this.setAndFlush(indexController, 'omg', 'lex');

      assert.equal(appModelCount, 1, 'app model hook did not run again');
      assert.equal(indexModelCount, 2, 'index model hook ran again due to refreshModel');
    }

    async ['@test multiple QP value changes only cause a single model refresh'](assert) {
      assert.expect(2);

      this.setSingleQPController('index', 'alex', 'lol');
      this.setSingleQPController('index', 'steely', 'lel');

      let refreshCount = 0;
      this.add(
        'route:index',
        Route.extend({
          queryParams: {
            alex: {
              refreshModel: true,
            },
            steely: {
              refreshModel: true,
            },
          },
          refresh() {
            refreshCount++;
          },
        })
      );

      await this.visitAndAssert('/');

      let indexController = this.getController('index');
      await this.setAndFlush(indexController, {
        alex: 'fran',
        steely: 'david',
      });

      assert.equal(refreshCount, 1, 'index refresh hook only run once');
    }

    ['@test refreshModel does not cause a second transition during app boot '](assert) {
      assert.expect(1);

      this.setSingleQPController('application', 'appomg', 'applol');
      this.setSingleQPController('index', 'omg', 'lol');

      this.add(
        'route:index',
        Route.extend({
          queryParams: {
            omg: {
              refreshModel: true,
            },
          },
          refresh() {
            assert.ok(false);
          },
        })
      );

      return this.visitAndAssert('/?appomg=hello&omg=world');
    }

    async ['@test queryParams are updated when a controller property is set and the route is refreshed. Issue #13263  '](
      assert
    ) {
      this.addTemplate(
        'application',
        '<button id="test-button" {{action \'increment\'}}>Increment</button><span id="test-value">{{foo}}</span>{{outlet}}'
      );

      this.setSingleQPController('application', 'foo', 1, {
        actions: {
          increment() {
            this.incrementProperty('foo');
            this.send('refreshRoute');
          },
        },
      });

      this.add(
        'route:application',
        Route.extend({
          actions: {
            refreshRoute() {
              this.refresh();
            },
          },
        })
      );

      await this.visitAndAssert('/');
      assert.equal(getTextOf(document.getElementById('test-value')), '1');

      document.getElementById('test-button').click();
      await runLoopSettled();

      assert.equal(getTextOf(document.getElementById('test-value')), '2');
      this.assertCurrentPath('/?foo=2');

      document.getElementById('test-button').click();
      await runLoopSettled();

      assert.equal(getTextOf(document.getElementById('test-value')), '3');
      this.assertCurrentPath('/?foo=3');
    }

    async ["@test Use Ember.get to retrieve query params 'refreshModel' configuration"](assert) {
      assert.expect(7);

      this.setSingleQPController('application', 'appomg', 'applol');
      this.setSingleQPController('index', 'omg', 'lol');

      let appModelCount = 0;
      this.add(
        'route:application',
        Route.extend({
          model(/* params */) {
            appModelCount++;
          },
        })
      );

      let indexModelCount = 0;
      this.add(
        'route:index',
        Route.extend({
          queryParams: EmberObject.create({
            unknownProperty() {
              return { refreshModel: true };
            },
          }),
          model(params) {
            indexModelCount++;

            if (indexModelCount === 1) {
              assert.deepEqual(params, { omg: 'lol' });
            } else if (indexModelCount === 2) {
              assert.deepEqual(params, { omg: 'lex' });
            }
          },
        })
      );

      await this.visitAndAssert('/');
      assert.equal(appModelCount, 1);
      assert.equal(indexModelCount, 1);

      let indexController = this.getController('index');
      await this.setAndFlush(indexController, 'omg', 'lex');

      assert.equal(appModelCount, 1);
      assert.equal(indexModelCount, 2);
    }

    async ['@test can use refreshModel even with URL changes that remove QPs from address bar'](
      assert
    ) {
      assert.expect(4);

      this.setSingleQPController('index', 'omg', 'lol');

      let indexModelCount = 0;
      this.add(
        'route:index',
        Route.extend({
          queryParams: {
            omg: {
              refreshModel: true,
            },
          },
          model(params) {
            indexModelCount++;

            let data;
            if (indexModelCount === 1) {
              data = 'foo';
            } else if (indexModelCount === 2) {
              data = 'lol';
            }

            assert.deepEqual(params, { omg: data }, 'index#model receives right data');
          },
        })
      );

      await this.visitAndAssert('/?omg=foo');
      await this.transitionTo('/');

      let indexController = this.getController('index');
      assert.equal(indexController.get('omg'), 'lol');
    }

    async ['@test can opt into a replace query by specifying replace:true in the Route config hash'](
      assert
    ) {
      assert.expect(2);

      this.setSingleQPController('application', 'alex', 'matchneer');

      this.add(
        'route:application',
        Route.extend({
          queryParams: {
            alex: {
              replace: true,
            },
          },
        })
      );

      await this.visitAndAssert('/');

      let appController = this.getController('application');
      this.expectedReplaceURL = '/?alex=wallace';

      await this.setAndFlush(appController, 'alex', 'wallace');
    }

    async ['@test Route query params config can be configured using property name instead of URL key'](
      assert
    ) {
      assert.expect(2);

      this.add(
        'controller:application',
        Controller.extend({
          queryParams: [{ commitBy: 'commit_by' }],
        })
      );

      this.add(
        'route:application',
        Route.extend({
          queryParams: {
            commitBy: {
              replace: true,
            },
          },
        })
      );

      await this.visitAndAssert('/');

      let appController = this.getController('application');
      this.expectedReplaceURL = '/?commit_by=igor_seb';

      await this.setAndFlush(appController, 'commitBy', 'igor_seb');
    }

    async ['@test An explicit replace:false on a changed QP always wins and causes a pushState'](
      assert
    ) {
      assert.expect(3);

      this.add(
        'controller:application',
        Controller.extend({
          queryParams: ['alex', 'steely'],
          alex: 'matchneer',
          steely: 'dan',
        })
      );

      this.add(
        'route:application',
        Route.extend({
          queryParams: {
            alex: {
              replace: true,
            },
            steely: {
              replace: false,
            },
          },
        })
      );

      await this.visit('/');
      let appController = this.getController('application');
      this.expectedPushURL = '/?alex=wallace&steely=jan';
      await this.setAndFlush(appController, { alex: 'wallace', steely: 'jan' });

      this.expectedPushURL = '/?alex=wallace&steely=fran';
      await this.setAndFlush(appController, { steely: 'fran' });

      this.expectedReplaceURL = '/?alex=sriracha&steely=fran';
      await this.setAndFlush(appController, 'alex', 'sriracha');
    }

    ['@test can opt into full transition by setting refreshModel in route queryParams when transitioning from child to parent'](
      assert
    ) {
      this.addTemplate('parent', '{{outlet}}');
      this.addTemplate(
        'parent.child',
        "{{link-to 'Parent' 'parent' (query-params foo='change') id='parent-link'}}"
      );

      this.router.map(function () {
        this.route('parent', function () {
          this.route('child');
        });
      });

      let parentModelCount = 0;
      this.add(
        'route:parent',
        Route.extend({
          model() {
            parentModelCount++;
          },
          queryParams: {
            foo: {
              refreshModel: true,
            },
          },
        })
      );

      this.setSingleQPController('parent', 'foo', 'abc');

      return this.visit('/parent/child?foo=lol').then(() => {
        assert.equal(parentModelCount, 1);

        run(document.getElementById('parent-link'), 'click');
        assert.equal(parentModelCount, 2);
      });
    }

    async ["@test Use Ember.get to retrieve query params 'replace' configuration"](assert) {
      assert.expect(2);

      this.setSingleQPController('application', 'alex', 'matchneer');

      this.add(
        'route:application',
        Route.extend({
          queryParams: EmberObject.create({
            unknownProperty(/* keyName */) {
              // We are simulating all qps requiring refresh
              return { replace: true };
            },
          }),
        })
      );

      await this.visitAndAssert('/');

      let appController = this.getController('application');
      this.expectedReplaceURL = '/?alex=wallace';

      await this.setAndFlush(appController, 'alex', 'wallace');
    }

    async ['@test can override incoming QP values in setupController'](assert) {
      assert.expect(3);

      this.router.map(function () {
        this.route('about');
      });

      this.setSingleQPController('index', 'omg', 'lol');

      this.add(
        'route:index',
        Route.extend({
          setupController(controller) {
            assert.ok(true, 'setupController called');
            controller.set('omg', 'OVERRIDE');
          },
          actions: {
            queryParamsDidChange() {
              assert.ok(false, "queryParamsDidChange shouldn't fire");
            },
          },
        })
      );

      await this.visitAndAssert('/about');
      await this.transitionTo('index');

      this.assertCurrentPath('/?omg=OVERRIDE');
    }

    async ['@test can override incoming QP array values in setupController'](assert) {
      assert.expect(3);

      this.router.map(function () {
        this.route('about');
      });

      this.setSingleQPController('index', 'omg', ['lol']);

      this.add(
        'route:index',
        Route.extend({
          setupController(controller) {
            assert.ok(true, 'setupController called');
            controller.set('omg', ['OVERRIDE']);
          },
          actions: {
            queryParamsDidChange() {
              assert.ok(false, "queryParamsDidChange shouldn't fire");
            },
          },
        })
      );

      await this.visitAndAssert('/about');
      await this.transitionTo('index');

      this.assertCurrentPath('/?omg=' + encodeURIComponent(JSON.stringify(['OVERRIDE'])));
    }

    ['@test URL transitions that remove QPs still register as QP changes'](assert) {
      assert.expect(2);

      this.setSingleQPController('index', 'omg', 'lol');

      return this.visit('/?omg=borf').then(() => {
        let indexController = this.getController('index');
        assert.equal(indexController.get('omg'), 'borf');

        this.transitionTo('/');
        assert.equal(indexController.get('omg'), 'lol');
      });
    }

    ['@test Subresource naming style is supported'](assert) {
      assert.expect(5);

      this.router.map(function () {
        this.route('abc.def', { path: '/abcdef' }, function () {
          this.route('zoo');
        });
      });

      this.addTemplate(
        'application',
        "{{link-to 'A' 'abc.def' (query-params foo='123') id='one'}}{{link-to 'B' 'abc.def.zoo' (query-params foo='123' bar='456') id='two'}}{{outlet}}"
      );

      this.setSingleQPController('abc.def', 'foo', 'lol');
      this.setSingleQPController('abc.def.zoo', 'bar', 'haha');

      return this.visitAndAssert('/').then(() => {
        assert.equal(this.$('#one').attr('href'), '/abcdef?foo=123');
        assert.equal(this.$('#two').attr('href'), '/abcdef/zoo?bar=456&foo=123');

        run(this.$('#one'), 'click');
        this.assertCurrentPath('/abcdef?foo=123');

        run(this.$('#two'), 'click');
        this.assertCurrentPath('/abcdef/zoo?bar=456&foo=123');
      });
    }

    async ['@test transitionTo supports query params']() {
      this.setSingleQPController('index', 'foo', 'lol');

      await this.visitAndAssert('/');
      await this.transitionTo({ queryParams: { foo: 'borf' } });
      this.assertCurrentPath('/?foo=borf', 'shorthand supported');

      await this.transitionTo({ queryParams: { 'index:foo': 'blaf' } });
      this.assertCurrentPath('/?foo=blaf', 'longform supported');

      await this.transitionTo({ queryParams: { 'index:foo': false } });
      this.assertCurrentPath('/?foo=false', 'longform supported (bool)');

      await this.transitionTo({ queryParams: { foo: false } });
      this.assertCurrentPath('/?foo=false', 'shorhand supported (bool)');
    }

    async ['@test transitionTo supports query params (multiple)']() {
      this.add(
        'controller:index',
        Controller.extend({
          queryParams: ['foo', 'bar'],
          foo: 'lol',
          bar: 'wat',
        })
      );

      await this.visitAndAssert('/');
      await this.transitionTo({ queryParams: { foo: 'borf' } });
      this.assertCurrentPath('/?foo=borf', 'shorthand supported');

      await this.transitionTo({ queryParams: { 'index:foo': 'blaf' } });
      this.assertCurrentPath('/?foo=blaf', 'longform supported');

      await this.transitionTo({ queryParams: { 'index:foo': false } });
      this.assertCurrentPath('/?foo=false', 'longform supported (bool)');

      await this.transitionTo({ queryParams: { foo: false } });
      this.assertCurrentPath('/?foo=false', 'shorhand supported (bool)');
    }

    async ["@test setting controller QP to empty string doesn't generate null in URL"](assert) {
      assert.expect(1);

      this.setSingleQPController('index', 'foo', '123');

      await this.visit('/');
      let controller = this.getController('index');

      this.expectedPushURL = '/?foo=';
      await this.setAndFlush(controller, 'foo', '');
    }

    async ["@test setting QP to empty string doesn't generate null in URL"](assert) {
      assert.expect(1);

      this.add(
        'route:index',
        Route.extend({
          queryParams: {
            foo: {
              defaultValue: '123',
            },
          },
        })
      );

      await this.visit('/');
      let controller = this.getController('index');

      this.expectedPushURL = '/?foo=';
      await this.setAndFlush(controller, 'foo', '');
    }

    ['@test A default boolean value deserializes QPs as booleans rather than strings'](assert) {
      assert.expect(3);

      this.setSingleQPController('index', 'foo', false);

      this.add(
        'route:index',
        Route.extend({
          model(params) {
            assert.equal(params.foo, true, 'model hook received foo as boolean true');
          },
        })
      );

      return this.visit('/?foo=true').then(() => {
        let controller = this.getController('index');
        assert.equal(controller.get('foo'), true);

        this.transitionTo('/?foo=false');
        assert.equal(controller.get('foo'), false);
      });
    }

    ['@test Query param without value are empty string'](assert) {
      assert.expect(1);

      this.add(
        'controller:index',
        Controller.extend({
          queryParams: ['foo'],
          foo: '',
        })
      );

      return this.visit('/?foo=').then(() => {
        let controller = this.getController('index');
        assert.equal(controller.get('foo'), '');
      });
    }

    async ['@test Array query params can be set'](assert) {
      assert.expect(2);

      this.router.map(function () {
        this.route('home', { path: '/' });
      });

      this.setSingleQPController('home', 'foo', []);

      await this.visit('/');
      let controller = this.getController('home');

      await this.setAndFlush(controller, 'foo', [1, 2]);
      this.assertCurrentPath('/?foo=%5B1%2C2%5D');

      await this.setAndFlush(controller, 'foo', [3, 4]);
      this.assertCurrentPath('/?foo=%5B3%2C4%5D');
    }

    async ['@test (de)serialization: arrays'](assert) {
      assert.expect(4);

      this.setSingleQPController('index', 'foo', [1]);

      await this.visitAndAssert('/');
      await this.transitionTo({ queryParams: { foo: [2, 3] } });
      this.assertCurrentPath('/?foo=%5B2%2C3%5D', 'shorthand supported');
      await this.transitionTo({ queryParams: { 'index:foo': [4, 5] } });
      this.assertCurrentPath('/?foo=%5B4%2C5%5D', 'longform supported');
      await this.transitionTo({ queryParams: { foo: [] } });
      this.assertCurrentPath('/?foo=%5B%5D', 'longform supported');
    }

    ['@test Url with array query param sets controller property to array'](assert) {
      assert.expect(1);

      this.setSingleQPController('index', 'foo', '');

      return this.visit('/?foo[]=1&foo[]=2&foo[]=3').then(() => {
        let controller = this.getController('index');
        assert.deepEqual(controller.get('foo'), ['1', '2', '3']);
      });
    }

    async ['@test Array query params can be pushed/popped'](assert) {
      assert.expect(17);

      this.router.map(function () {
        this.route('home', { path: '/' });
      });

      this.setSingleQPController('home', 'foo', emberA());

      await this.visitAndAssert('/');
      let controller = this.getController('home');

      controller.foo.pushObject(1);
      await runLoopSettled();
      this.assertCurrentPath('/?foo=%5B1%5D');
      assert.deepEqual(controller.foo, [1]);

      controller.foo.popObject();
      await runLoopSettled();
      this.assertCurrentPath('/');
      assert.deepEqual(controller.foo, []);

      controller.foo.pushObject(1);
      await runLoopSettled();
      this.assertCurrentPath('/?foo=%5B1%5D');
      assert.deepEqual(controller.foo, [1]);

      controller.foo.popObject();
      await runLoopSettled();
      this.assertCurrentPath('/');
      assert.deepEqual(controller.foo, []);

      controller.foo.pushObject(1);
      await runLoopSettled();
      this.assertCurrentPath('/?foo=%5B1%5D');
      assert.deepEqual(controller.foo, [1]);

      controller.foo.pushObject(2);
      await runLoopSettled();
      this.assertCurrentPath('/?foo=%5B1%2C2%5D');
      assert.deepEqual(controller.foo, [1, 2]);

      controller.foo.popObject();
      await runLoopSettled();
      this.assertCurrentPath('/?foo=%5B1%5D');
      assert.deepEqual(controller.foo, [1]);

      controller.foo.unshiftObject('lol');
      await runLoopSettled();
      this.assertCurrentPath('/?foo=%5B%22lol%22%2C1%5D');
      assert.deepEqual(controller.foo, ['lol', 1]);
    }

    async ["@test Overwriting with array with same content shouldn't refire update"](assert) {
      assert.expect(4);

      this.router.map(function () {
        this.route('home', { path: '/' });
      });

      let modelCount = 0;
      this.add(
        'route:home',
        Route.extend({
          model() {
            modelCount++;
          },
        })
      );

      this.setSingleQPController('home', 'foo', emberA([1]));

      await this.visitAndAssert('/');
      assert.equal(modelCount, 1);

      let controller = this.getController('home');
      await this.setAndFlush(controller, 'model', emberA([1]));

      assert.equal(modelCount, 1);
      this.assertCurrentPath('/');
    }

    ['@test Defaulting to params hash as the model should not result in that params object being watched'](
      assert
    ) {
      assert.expect(1);

      this.router.map(function () {
        this.route('other');
      });

      // This causes the params hash, which is returned as a route's
      // model if no other model could be resolved given the provided
      // params (and no custom model hook was defined), to be watched,
      // unless we return a copy of the params hash.
      this.setSingleQPController('application', 'woot', 'wat');

      this.add(
        'route:other',
        Route.extend({
          model(p, trans) {
            let m = peekMeta(trans[PARAMS_SYMBOL].application);
            assert.ok(m === null, "A meta object isn't constructed for this params POJO");
          },
        })
      );

      return this.visit('/').then(() => {
        this.transitionTo('other');
      });
    }

    async ['@test Setting bound query param property to null or undefined does not serialize to url'](
      assert
    ) {
      assert.expect(9);

      this.router.map(function () {
        this.route('home');
      });

      this.setSingleQPController('home', 'foo', [1, 2]);

      await this.visitAndAssert('/home');
      let controller = this.getController('home');

      assert.deepEqual(controller.get('foo'), [1, 2]);
      this.assertCurrentPath('/home');

      await this.setAndFlush(controller, 'foo', emberA([1, 3]));
      this.assertCurrentPath('/home?foo=%5B1%2C3%5D');

      await this.transitionTo('/home');

      assert.deepEqual(controller.get('foo'), [1, 2]);
      this.assertCurrentPath('/home');

      await this.setAndFlush(controller, 'foo', null);
      this.assertCurrentPath('/home', 'Setting property to null');

      await this.setAndFlush(controller, 'foo', emberA([1, 3]));
      this.assertCurrentPath('/home?foo=%5B1%2C3%5D');

      await this.setAndFlush(controller, 'foo', undefined);
      this.assertCurrentPath('/home', 'Setting property to undefined');
    }

    ['@test {{link-to}} with null or undefined QPs does not get serialized into url'](assert) {
      assert.expect(3);

      this.addTemplate(
        'home',
        "{{link-to 'Home' 'home' (query-params foo=nullValue) id='null-link'}}{{link-to 'Home' 'home' (query-params foo=undefinedValue) id='undefined-link'}}"
      );

      this.router.map(function () {
        this.route('home');
      });

      this.setSingleQPController('home', 'foo', [], {
        nullValue: null,
        undefinedValue: undefined,
      });

      return this.visitAndAssert('/home').then(() => {
        assert.equal(this.$('#null-link').attr('href'), '/home');
        assert.equal(this.$('#undefined-link').attr('href'), '/home');
      });
    }

    ["@test A child of a resource route still defaults to parent route's model even if the child route has a query param"](
      assert
    ) {
      assert.expect(2);

      this.setSingleQPController('index', 'woot', undefined, {
        woot: undefined,
      });

      this.add(
        'route:application',
        Route.extend({
          model(/* p, trans */) {
            return { woot: true };
          },
        })
      );

      this.add(
        'route:index',
        Route.extend({
          setupController(controller, model) {
            assert.deepEqual(
              model,
              { woot: true },
              'index route inherited model route from parent route'
            );
          },
        })
      );

      return this.visitAndAssert('/');
    }

    async ['@test opting into replace does not affect transitions between routes'](assert) {
      assert.expect(5);

      this.addTemplate(
        'application',
        "{{link-to 'Foo' 'foo' id='foo-link'}}{{link-to 'Bar' 'bar' id='bar-no-qp-link'}}{{link-to 'Bar' 'bar' (query-params raytiley='isthebest') id='bar-link'}}{{outlet}}"
      );

      this.router.map(function () {
        this.route('foo');
        this.route('bar');
      });

      this.setSingleQPController('bar', 'raytiley', 'israd');

      this.add(
        'route:bar',
        Route.extend({
          queryParams: {
            raytiley: {
              replace: true,
            },
          },
        })
      );

      await this.visit('/');
      let controller = this.getController('bar');

      this.expectedPushURL = '/foo';
      run(document.getElementById('foo-link'), 'click');

      this.expectedPushURL = '/bar';
      run(document.getElementById('bar-no-qp-link'), 'click');

      this.expectedReplaceURL = '/bar?raytiley=woot';
      await this.setAndFlush(controller, 'raytiley', 'woot');

      this.expectedPushURL = '/foo';
      run(document.getElementById('foo-link'), 'click');

      this.expectedPushURL = '/bar?raytiley=isthebest';
      run(document.getElementById('bar-link'), 'click');
    }

    ["@test undefined isn't serialized or deserialized into a string"](assert) {
      assert.expect(4);

      this.router.map(function () {
        this.route('example');
      });

      this.addTemplate(
        'application',
        "{{link-to 'Example' 'example' (query-params foo=undefined) id='the-link'}}"
      );

      this.setSingleQPController('example', 'foo', undefined, {
        foo: undefined,
      });

      this.add(
        'route:example',
        Route.extend({
          model(params) {
            assert.deepEqual(params, { foo: undefined });
          },
        })
      );

      return this.visitAndAssert('/').then(() => {
        assert.equal(
          this.$('#the-link').attr('href'),
          '/example',
          'renders without undefined qp serialized'
        );

        return this.transitionTo('example', {
          queryParams: { foo: undefined },
        }).then(() => {
          this.assertCurrentPath('/example');
        });
      });
    }

    ['@test when refreshModel is true and loading hook is undefined, model hook will rerun when QPs change even if previous did not finish']() {
      return this.refreshModelWhileLoadingTest();
    }

    ['@test when refreshModel is true and loading hook returns false, model hook will rerun when QPs change even if previous did not finish']() {
      return this.refreshModelWhileLoadingTest(false);
    }

    ['@test when refreshModel is true and loading hook returns true, model hook will rerun when QPs change even if previous did not finish']() {
      return this.refreshModelWhileLoadingTest(true);
    }

    async ["@test warn user that Route's queryParams configuration must be an Object, not an Array"](
      assert
    ) {
      assert.expect(1);

      this.add(
        'route:application',
        Route.extend({
          queryParams: [{ commitBy: { replace: true } }],
        })
      );

      await assert.rejectsAssertion(
        this.visit('/'),
        'You passed in `[{"commitBy":{"replace":true}}]` as the value for `queryParams` but `queryParams` cannot be an Array'
      );
    }

    async ['@test handle route names that clash with Object.prototype properties'](assert) {
      assert.expect(1);

      this.router.map(function () {
        this.route('constructor');
      });

      this.add(
        'route:constructor',
        Route.extend({
          queryParams: {
            foo: {
              defaultValue: '123',
            },
          },
        })
      );

      await this.visit('/');
      await this.transitionTo('constructor', { queryParams: { foo: '999' } });
      let controller = this.getController('constructor');
      assert.equal(get(controller, 'foo'), '999');
    }

    async ['@test Single query params defined with tracked properties can be on the controller and reflected in the url'](
      assert
    ) {
      assert.expect(3);

      this.router.map(function () {
        this.route('home', { path: '/' });
      });

      this.add(
        `controller:home`,
        Controller.extend({
          queryParams: ['foo'],
          foo: tracked(),
        })
      );

      await this.visitAndAssert('/');
      let controller = this.getController('home');

      controller.foo = '456';
      await runLoopSettled();
      this.assertCurrentPath('/?foo=456');

      controller.foo = '987';
      await runLoopSettled();
      this.assertCurrentPath('/?foo=987');
    }

    async ['@test Single query params defined with tracked properties can be linked to (and log is present)'](
      assert
    ) {
      assert.expect(3);

      this.addTemplate(
        'application',
        `
          <LinkTo @route="application" id="the-link">
            Home
          </LinkTo>
          <LinkTo @route="application" @query={{hash foo=(array 123)}} id="the-link-with-params">
            'Home (with params)'
          </LinkTo>

          <!-- this log caused a failure previously, so we leave it to make sure this case is tested -->
          {{log this.foo}}
        `
      );

      this.add(
        `controller:application`,
        class extends Controller {
          queryParams = ['foo', 'bar'];
          @tracked foo = [];
          @tracked bar = [];
        }
      );

      await this.visitAndAssert('/');

      document.getElementById('the-link').click();
      await runLoopSettled();
      this.assertCurrentPath('/');

      document.getElementById('the-link-with-params').click();
      await runLoopSettled();
      this.assertCurrentPath('/?foo=%5B123%5D');
    }

    async ['@test Single query params defined with native getters and tracked properties can be on the controller and reflected in the url'](
      assert
    ) {
      assert.expect(3);

      this.router.map(function () {
        this.route('home', { path: '/' });
      });

      this.add(
        `controller:home`,
        Controller.extend({
          queryParams: ['foo'],
          get foo() {
            return this.bar;
          },

          set foo(value) {
            this.bar = value;
          },

          bar: tracked(),
        })
      );

      await this.visitAndAssert('/');
      let controller = this.getController('home');

      controller.bar = '456';
      await runLoopSettled();
      this.assertCurrentPath('/?foo=456');

      controller.bar = '987';
      await runLoopSettled();
      this.assertCurrentPath('/?foo=987');
    }

    async [`@test Updating single query parameter doesn't affect other query parameters. Issue #14438`](
      assert
    ) {
      assert.expect(5);

      this.router.map(function () {
        this.route('grandparent', { path: 'grandparent/:foo' }, function () {
          this.route('parent', function () {
            this.route('child');
          });
        });
      });

      this.addTemplate('grandparent.parent.loading', 'Loading...');

      this.add(
        'route:index',
        Route.extend({
          redirect() {
            this.transitionTo('grandparent.parent.child', 1);
          },
        })
      );

      this.add(
        'route:grandparent.parent.child',
        Route.extend({
          model() {
            return Promise.resolve();
          },
        })
      );

      this.add(
        'controller:grandparent.parent',
        Controller.extend({
          queryParams: ['foo', 'bar'],

          foo: 'FOO',
          bar: 'BAR',
        })
      );

      await this.visit('/');

      this.assertCurrentPath('/grandparent/1/parent/child');
      let parentController = this.getController('grandparent.parent');

      await this.setAndFlush(parentController, 'foo', 'NEW_FOO');
      assert.equal(parentController.foo, 'NEW_FOO');
      this.assertCurrentPath('/grandparent/1/parent/child?foo=NEW_FOO');

      await this.setAndFlush(parentController, 'bar', 'NEW_BAR');
      assert.equal(parentController.bar, 'NEW_BAR');
      this.assertCurrentPath('/grandparent/1/parent/child?bar=NEW_BAR&foo=NEW_FOO');
    }
  }
);
