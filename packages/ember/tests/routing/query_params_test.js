import Controller from '@ember/controller';
import { dasherize } from '@ember/-internals/string';
import EmberObject, { action, get, computed } from '@ember/object';
import { RSVP } from '@ember/-internals/runtime';
import { A as emberA } from '@ember/array';
import { run } from '@ember/runloop';
import { peekMeta } from '@ember/-internals/meta';
import { tracked } from '@ember/-internals/metal';
import Route from '@ember/routing/route';
import { PARAMS_SYMBOL } from 'router_js';
import { service } from '@ember/service';

import { precompileTemplate } from '@ember/template-compilation';
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
        class extends Route {
          queryParams = {
            appomg: {
              defaultValue: 'applol',
            },
          };
          model(/* params */) {
            appModelCount++;
          }
        }
      );

      this.setSingleQPController('index', 'omg', undefined, {
        omg: undefined,
      });

      let actionName = typeof loadingReturn !== 'undefined' ? 'loading' : 'ignore';
      let indexModelCount = 0;
      this.add(
        'route:index',
        class extends Route {
          queryParams = {
            omg: {
              refreshModel: true,
            },
          };
          [actionName] = action(function () {
            return loadingReturn;
          });
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
          }
        }
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
        class extends Route {
          @service
          router;
          afterModel() {
            this.router.transitionTo('parent.sibling');
          }
        }
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

    ['@test Calling transitionTo does not serialize query params already serialized on the activeTransition'](
      assert
    ) {
      assert.expect(3);

      this.router.map(function () {
        this.route('parent', function () {
          this.route('child');
          this.route('sibling');
        });
      });

      this.add(
        'route:parent.child',
        class extends Route {
          @service
          router;
          afterModel() {
            this.router.transitionTo('parent.sibling');
          }
        }
      );

      this.add(
        'controller:parent',
        class extends Controller {
          queryParams = ['array', 'string'];
          array = [];
          string = '';
        }
      );

      // `/parent/child?array=["one",2]&string=hello`
      return this.visit('/parent/child?array=%5B%22one%22%2C2%5D&string=hello').then(() => {
        this.assertCurrentPath(
          '/parent/sibling?array=%5B%22one%22%2C2%5D&string=hello',
          'redirected to the sibling route, instead of child route'
        );
        assert.equal(
          this.getController('parent').get('string'),
          'hello',
          'controller has value from the active transition'
        );
        assert.deepEqual(
          this.getController('parent').get('array'),
          ['one', 2],
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
        class extends Controller {
          queryParams = [{ foo: 'other_foo', bar: { as: 'other_bar' } }];
          foo = 'FOO';
          bar = 'BAR';
        }
      );

      await this.visitAndAssert('/');
      let controller = this.getController('index');

      await this.setAndFlush(controller, 'foo', 'LEX');
      this.assertCurrentPath('/?other_foo=LEX', "QP mapped correctly without 'as'");

      await this.setAndFlush(controller, 'foo', 'WOO');
      this.assertCurrentPath('/?other_foo=WOO', "QP updated correctly without 'as'");

      await this.transitionTo('/?other_foo=NAW');
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
        class extends Route {
          serializeQueryParamKey = dasherize;
        }
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
        class extends Route {
          model(params) {
            assert.deepEqual(params, { foo: 'bar' });
          }
        }
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
        class extends Route {
          model(params) {
            assert.deepEqual(params, { foo: 'bar', id: 'baz' });
          }
        }
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
        class extends Route {
          model(params) {
            assert.deepEqual(params, { foo: 'baz', id: 'boo' });
          }
        }
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
        class extends Route {
          setupController(controller) {
            assert.equal(
              controller.get('foo'),
              'YEAH',
              "controller's foo QP property set before setupController called"
            );
          }
        }
      );

      return this.visitAndAssert('/?foo=YEAH');
    }

    ['@test mapped query params have been set by the time setupController is called'](assert) {
      assert.expect(2);

      this.setSingleQPController('application', { faz: 'foo' });

      this.add(
        'route:application',
        class extends Route {
          setupController(controller) {
            assert.equal(
              controller.get('faz'),
              'YEAH',
              "controller's foo QP property set before setupController called"
            );
          }
        }
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
        class extends Route {
          model(/* params, transition */) {
            assert.deepEqual(
              this.paramsFor('index'),
              { something: 'baz', foo: 'bar' },
              'could retrieve params for index'
            );
          }
        }
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
        class extends Route {
          model(/* params, transition */) {
            assert.deepEqual(
              this.paramsFor('index'),
              { something: 'baz', foo: 'boo' },
              'could retrieve params for index'
            );
          }
        }
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
        class extends Route {
          model(/* params, transition */) {
            assert.deepEqual(
              this.paramsFor('index'),
              { something: 'baz', foo: false },
              'could retrieve params for index'
            );
          }
        }
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
        class extends Route {
          model(/* params, transition */) {
            assert.deepEqual(
              this.paramsFor('index'),
              { something: 'baz', foo: false },
              'could retrieve params for index'
            );
          }
        }
      );

      return this.visitAndAssert('/baz?foo=false');
    }

    ['@test model hook can query prefix-less application params'](assert) {
      assert.expect(4);

      this.setSingleQPController('application', 'appomg', 'applol');
      this.setSingleQPController('index', 'omg', 'lol');

      this.add(
        'route:application',
        class extends Route {
          model(params) {
            assert.deepEqual(params, { appomg: 'applol' });
          }
        }
      );

      this.add(
        'route:index',
        class extends Route {
          model(params) {
            assert.deepEqual(params, { omg: 'lol' });
            assert.deepEqual(this.paramsFor('application'), {
              appomg: 'applol',
            });
          }
        }
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
        class extends Route {
          model(params) {
            assert.deepEqual(params, { appomg: 'appyes' });
          }
        }
      );

      this.add(
        'route:index',
        class extends Route {
          model(params) {
            assert.deepEqual(params, { omg: 'yes' });
            assert.deepEqual(this.paramsFor('application'), {
              appomg: 'appyes',
            });
          }
        }
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
        class extends Route {
          model(/* params, transition */) {
            appModelCount++;
          }
        }
      );

      let indexModelCount = 0;
      this.add(
        'route:index',
        class extends Route {
          queryParams = {
            omg: {
              refreshModel: true,
            },
          };
          model(params) {
            indexModelCount++;

            if (indexModelCount === 1) {
              assert.deepEqual(params, { omg: 'lol' }, 'params are correct on first pass');
            } else if (indexModelCount === 2) {
              assert.deepEqual(params, { omg: 'lex' }, 'params are correct on second pass');
            }
          }
        }
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
        class extends Route {
          model(/* params */) {
            appModelCount++;
          }
        }
      );

      let indexModelCount = 0;
      this.add(
        'route:index',
        class extends Route {
          queryParams = {
            omg: {
              refreshModel: true,
              replace: true,
            },
          };
          model(params) {
            indexModelCount++;

            if (indexModelCount === 1) {
              assert.deepEqual(params, { omg: 'lol' }, 'params are correct on first pass');
            } else if (indexModelCount === 2) {
              assert.deepEqual(params, { omg: 'lex' }, 'params are correct on second pass');
            }
          }
        }
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
        class extends Route {
          queryParams = {
            alex: {
              refreshModel: true,
            },
            steely: {
              refreshModel: true,
            },
          };
          refresh() {
            refreshCount++;
          }
        }
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
        class extends Route {
          queryParams = {
            omg: {
              refreshModel: true,
            },
          };
          refresh() {
            assert.ok(false);
          }
        }
      );

      return this.visitAndAssert('/?appomg=hello&omg=world');
    }

    async ['@test queryParams are updated when a controller property is set and the route is refreshed. Issue #13263  '](
      assert
    ) {
      this.add(
        'template:application',
        precompileTemplate(
          '<button id="test-button" {{on "click" this.increment}}>Increment</button><span id="test-value">{{this.foo}}</span>{{outlet}}'
        )
      );

      this.setSingleQPController('application', 'foo', 1, {
        increment: action(function () {
          this.incrementProperty('foo');
          this.send('refreshRoute');
        }),
      });

      this.add(
        'route:application',
        class extends Route {
          @action
          refreshRoute() {
            this.refresh();
          }
        }
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
        class extends Route {
          model(/* params */) {
            appModelCount++;
          }
        }
      );

      let indexModelCount = 0;
      this.add(
        'route:index',
        class extends Route {
          queryParams = EmberObject.create({
            unknownProperty() {
              return { refreshModel: true };
            },
          });
          model(params) {
            indexModelCount++;

            if (indexModelCount === 1) {
              assert.deepEqual(params, { omg: 'lol' });
            } else if (indexModelCount === 2) {
              assert.deepEqual(params, { omg: 'lex' });
            }
          }
        }
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
        class extends Route {
          queryParams = {
            omg: {
              refreshModel: true,
            },
          };
          model(params) {
            indexModelCount++;

            let data;
            if (indexModelCount === 1) {
              data = 'foo';
            } else if (indexModelCount === 2) {
              data = 'lol';
            }

            assert.deepEqual(params, { omg: data }, 'index#model receives right data');
          }
        }
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
        class extends Route {
          queryParams = {
            alex: {
              replace: true,
            },
          };
        }
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
        class extends Controller {
          queryParams = [{ commitBy: 'commit_by' }];
        }
      );

      this.add(
        'route:application',
        class extends Route {
          queryParams = {
            commitBy: {
              replace: true,
            },
          };
        }
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
        class extends Controller {
          queryParams = ['alex', 'steely'];
          alex = 'matchneer';
          steely = 'dan';
        }
      );

      this.add(
        'route:application',
        class extends Route {
          queryParams = {
            alex: {
              replace: true,
            },
            steely: {
              replace: false,
            },
          };
        }
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

    async ['@test can opt into full transition by setting refreshModel in route queryParams when transitioning from child to parent'](
      assert
    ) {
      this.add('template:parent', precompileTemplate('{{outlet}}'));
      this.add(
        'template:parent.child',
        precompileTemplate(
          "<LinkTo @route='parent' @query={{hash foo='change'}} id='parent-link'>Parent</LinkTo>"
        )
      );

      this.router.map(function () {
        this.route('parent', function () {
          this.route('child');
        });
      });

      let parentModelCount = 0;
      this.add(
        'route:parent',
        class extends Route {
          model() {
            parentModelCount++;
          }
          queryParams = {
            foo: {
              refreshModel: true,
            },
          };
        }
      );

      this.setSingleQPController('parent', 'foo', 'abc');

      await this.visit('/parent/child?foo=lol');

      assert.equal(parentModelCount, 1);

      run(document.getElementById('parent-link'), 'click');
      assert.equal(parentModelCount, 2);
    }

    async ["@test Use Ember.get to retrieve query params 'replace' configuration"](assert) {
      assert.expect(2);

      this.setSingleQPController('application', 'alex', 'matchneer');

      this.add(
        'route:application',
        class extends Route {
          queryParams = EmberObject.create({
            unknownProperty(/* keyName */) {
              // We are simulating all qps requiring refresh
              return { replace: true };
            },
          });
        }
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
        class extends Route {
          setupController(controller) {
            assert.ok(true, 'setupController called');
            controller.set('omg', 'OVERRIDE');
          }
          @action
          queryParamsDidChange() {
            assert.ok(false, "queryParamsDidChange shouldn't fire");
          }
        }
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
        class extends Route {
          setupControl

    async ['@test [GH#20520] transitionTo to same route with null default query param does not error'](assert) {
      assert.expect(2);

      this.router.map(function () {
        this.route('base');
      });

      this.add(
        'controller:base',
        class extends Controller {
          queryParams = ['messageType'];
          messageType = null;
        }
      );

      let redirectCount = 0;
      this.add(
        'route:application',
        class extends Route {
          @service router;
          redirect() {
            // This is called on the initial transition to 'base',
            // which is initiated by visit('/base')
            // It should only run once for the test.
            if (redirectCount === 0) {
              redirectCount++;
              this.router.transitionTo('base');
            }
          }
        }
      );

      await this.visit('/base');

      assert.strictEqual(redirectCount, 1, 'redirect hook was entered');
      this.assertCurrentPath('/base');
    }
  }
);
