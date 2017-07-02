import {
  Controller,
  RSVP,
  Object as EmberObject,
  A as emberA,
  String as StringUtils
} from 'ember-runtime';
import {
  run,
  get,
  computed,
  peekMeta
} from 'ember-metal';
import { Route } from 'ember-routing';
import { jQuery } from 'ember-views';

import { QueryParamTestCase, moduleFor } from 'internal-test-helpers';

moduleFor('Query Params - main', class extends QueryParamTestCase {
  refreshModelWhileLoadingTest(loadingReturn) {
    let assert = this.assert;

    assert.expect(9);

    let appModelCount = 0;
    let promiseResolve;

    this.add('route:application', Route.extend({
      queryParams: {
        appomg: {
          defaultValue: 'applol'
        }
      },
      model() {
        appModelCount++;
      }
    }));

    this.setSingleQPController('index', 'omg', undefined, {
      omg: undefined
    });

    let actionName = typeof loadingReturn !== 'undefined' ? 'loading' : 'ignore';
    let indexModelCount = 0;
    this.add('route:index', Route.extend({
      queryParams: {
        omg: {
          refreshModel: true
        }
      },
      actions: {
        [actionName]: function() {
          return loadingReturn;
        }
      },
      model(params) {
        indexModelCount++;
        if (indexModelCount === 2) {
          assert.deepEqual(params, { omg: 'lex' });
          return new RSVP.Promise(function(resolve) {
            promiseResolve = resolve;
            return;
          });
        } else if (indexModelCount === 3) {
          assert.deepEqual(params, { omg: 'hello' }, 'Model hook reruns even if the previous one didn\'t finish');
        }
      }
    }));

    return this.visit('/').then(() => {
      assert.equal(appModelCount, 1, 'appModelCount is 1');
      assert.equal(indexModelCount, 1);

      let indexController = this.getController('index');
      this.setAndFlush(indexController, 'omg', 'lex');

      assert.equal(appModelCount, 1, 'appModelCount is 1');
      assert.equal(indexModelCount, 2);

      this.setAndFlush(indexController, 'omg', 'hello');
      assert.equal(appModelCount, 1, 'appModelCount is 1');
      assert.equal(indexModelCount, 3);

      run(function() {
        promiseResolve();
      });

      assert.equal(get(indexController, 'omg'), 'hello', 'At the end last value prevails');
    });
  }

  ['@test No replaceURL occurs on startup because default values don\'t show up in URL'](assert) {
    assert.expect(1);

    this.setSingleQPController('index');

    return this.visitAndAssert('/');
  }

  ['@test Calling transitionTo does not lose query params already on the activeTransition'](assert) {
    assert.expect(2);

    this.router.map(function() {
      this.route('parent', function() {
        this.route('child');
        this.route('sibling');
      });
    });

    this.add('route:parent.child', Route.extend({
      afterModel() {
        this.transitionTo('parent.sibling');
      }
    }));

    this.setSingleQPController('parent');

    return this.visit('/parent/child?foo=lol').then(() => {
      this.assertCurrentPath('/parent/sibling?foo=lol', 'redirected to the sibling route, instead of child route');
      assert.equal(this.getController('parent').get('foo'), 'lol', 'controller has value from the active transition');
    });
  }

  ['@test Single query params can be set on the controller and reflected in the url'](assert) {
    assert.expect(3);

    this.router.map(function() {
      this.route('home', { path: '/' });
    });

    this.setSingleQPController('home');

    return this.visitAndAssert('/').then(() => {
      let controller = this.getController('home');

      this.setAndFlush(controller, 'foo', '456');
      this.assertCurrentPath('/?foo=456');

      this.setAndFlush(controller, 'foo', '987');
      this.assertCurrentPath('/?foo=987');
    });
  }

  ['@test Query params can map to different url keys configured on the controller'](assert) {
    assert.expect(6);

    this.add('controller:index', Controller.extend({
      queryParams: [{ foo: 'other_foo', bar: { as: 'other_bar' } }],
      foo: 'FOO',
      bar: 'BAR'
    }));

    return this.visitAndAssert('/').then(() => {
      let controller = this.getController('index');

      this.setAndFlush(controller, 'foo', 'LEX');
      this.assertCurrentPath('/?other_foo=LEX', 'QP mapped correctly without \'as\'');

      this.setAndFlush(controller, 'foo', 'WOO');
      this.assertCurrentPath('/?other_foo=WOO', 'QP updated correctly without \'as\'');

      this.transitionTo('/?other_foo=NAW');
      assert.equal(controller.get('foo'), 'NAW', 'QP managed correctly on URL transition');

      this.setAndFlush(controller, 'bar', 'NERK');
      this.assertCurrentPath('/?other_bar=NERK&other_foo=NAW', 'QP mapped correctly with \'as\'');

      this.setAndFlush(controller, 'bar', 'NUKE');
      this.assertCurrentPath('/?other_bar=NUKE&other_foo=NAW', 'QP updated correctly with \'as\'');
    });
  }

  ['@test Routes have a private overridable serializeQueryParamKey hook'](assert) {
    assert.expect(2);

    this.add('route:index', Route.extend({
      serializeQueryParamKey: StringUtils.dasherize
    }));

    this.setSingleQPController('index', 'funTimes', '');

    return this.visitAndAssert('/').then(() => {
      let controller = this.getController('index');

      this.setAndFlush(controller, 'funTimes', 'woot');
      this.assertCurrentPath('/?fun-times=woot');
    });
  }

  ['@test Can override inherited QP behavior by specifying queryParams as a computed property'](assert) {
    assert.expect(3);

    this.setSingleQPController('index', 'a', 0, {
      queryParams: computed(function() {
        return ['c'];
      }),
      c: true
    });

    return this.visitAndAssert('/').then(() => {
      let indexController = this.getController('index');

      this.setAndFlush(indexController, 'a', 1);
      this.assertCurrentPath('/', 'QP did not update due to being overriden');

      this.setAndFlush(indexController, 'c', false);
      this.assertCurrentPath('/?c=false', 'QP updated with overridden param');
    });
  }

  ['@test Can concatenate inherited QP behavior by specifying queryParams as an array'](assert) {
    assert.expect(3);

    this.setSingleQPController('index', 'a', 0, {
      queryParams: ['c'],
      c: true
    });

    return this.visitAndAssert('/').then(() => {
      let indexController = this.getController('index');

      this.setAndFlush(indexController, 'a', 1);
      this.assertCurrentPath('/?a=1', 'Inherited QP did update');

      this.setAndFlush(indexController, 'c', false);
      this.assertCurrentPath('/?a=1&c=false', 'New QP did update');
    });
  }

  ['@test model hooks receives query params'](assert) {
    assert.expect(2);

    this.setSingleQPController('index');

    this.add('route:index', Route.extend({
      model(params) {
        assert.deepEqual(params, { foo: 'bar' });
      }
    }));

    return this.visitAndAssert('/');
  }

  ['@test model hooks receives query params with dynamic segment params'](assert) {
    assert.expect(2);

    this.router.map(function() {
      this.route('index', { path: '/:id' });
    });

    this.setSingleQPController('index');

    this.add('route:index', Route.extend({
      model(params) {
        assert.deepEqual(params, { foo: 'bar', id: 'baz' });
      }
    }));

    return this.visitAndAssert('/baz');
  }

  ['@test model hooks receives query params (overridden by incoming url value)'](assert) {
    assert.expect(2);

    this.router.map(function() {
      this.route('index', { path: '/:id' });
    });

    this.setSingleQPController('index');

    this.add('route:index', Route.extend({
      model(params) {
        assert.deepEqual(params, { foo: 'baz', id: 'boo' });
      }
    }));

    return this.visitAndAssert('/boo?foo=baz');
  }

  ['@test error is thrown if dynamic segment and query param have same name'](assert) {
    assert.expect(1);

    this.router.map(function() {
      this.route('index', { path: '/:foo' });
    });

    this.setSingleQPController('index');

    expectAssertion(() => {
      this.visitAndAssert('/boo?foo=baz');
    }, `The route 'index' has both a dynamic segment and query param with name 'foo'. Please rename one to avoid collisions.`);
  }

  ['@test query params have been set by the time setupController is called'](assert) {
    assert.expect(2);

    this.setSingleQPController('application');

    this.add('route:application', Route.extend({
      setupController(controller) {
        assert.equal(controller.get('foo'), 'YEAH', 'controller\'s foo QP property set before setupController called');
      }
    }));

    return this.visitAndAssert('/?foo=YEAH');
  }

  ['@test mapped query params have been set by the time setupController is called'](assert) {
    assert.expect(2);

    this.setSingleQPController('application', { faz: 'foo' });

    this.add('route:application', Route.extend({
      setupController(controller) {
        assert.equal(controller.get('faz'), 'YEAH', 'controller\'s foo QP property set before setupController called');
      }
    }));

    return this.visitAndAssert('/?foo=YEAH');
  }

  ['@test Route#paramsFor fetches query params with default value'](assert) {
    assert.expect(2);

    this.router.map(function() {
      this.route('index', { path: '/:something' });
    });

    this.setSingleQPController('index');

    this.add('route:index', Route.extend({
      model() {
        assert.deepEqual(this.paramsFor('index'), { something: 'baz', foo: 'bar' }, 'could retrieve params for index');
      }
    }));

    return this.visitAndAssert('/baz');
  }

  ['@test Route#paramsFor fetches query params with non-default value'](assert) {
    assert.expect(2);

    this.router.map(function() {
      this.route('index', { path: '/:something' });
    });

    this.setSingleQPController('index');

    this.add('route:index', Route.extend({
      model() {
        assert.deepEqual(this.paramsFor('index'), { something: 'baz', foo: 'boo' }, 'could retrieve params for index');
      }
    }));

    return this.visitAndAssert('/baz?foo=boo');
  }

  ['@test Route#paramsFor fetches default falsy query params'](assert) {
    assert.expect(2);

    this.router.map(function() {
      this.route('index', { path: '/:something' });
    });

    this.setSingleQPController('index', 'foo', false);

    this.add('route:index', Route.extend({
      model() {
        assert.deepEqual(this.paramsFor('index'), { something: 'baz', foo: false }, 'could retrieve params for index');
      }
    }));

    return this.visitAndAssert('/baz');
  }

  ['@test Route#paramsFor fetches non-default falsy query params'](assert) {
    assert.expect(2);

    this.router.map(function() {
      this.route('index', { path: '/:something' });
    });

    this.setSingleQPController('index', 'foo', true);

    this.add('route:index', Route.extend({
      model() {
        assert.deepEqual(this.paramsFor('index'), { something: 'baz', foo: false }, 'could retrieve params for index');
      }
    }));

    return this.visitAndAssert('/baz?foo=false');
  }

  ['@test model hook can query prefix-less application params'](assert) {
    assert.expect(4);

    this.setSingleQPController('application', 'appomg', 'applol');
    this.setSingleQPController('index', 'omg', 'lol');

    this.add('route:application', Route.extend({
      model(params) {
        assert.deepEqual(params, { appomg: 'applol' });
      }
    }));

    this.add('route:index', Route.extend({
      model(params) {
        assert.deepEqual(params, { omg: 'lol' });
        assert.deepEqual(this.paramsFor('application'), { appomg: 'applol' });
      }
    }));

    return this.visitAndAssert('/');
  }

  ['@test model hook can query prefix-less application params (overridden by incoming url value)'](assert) {
    assert.expect(4);

    this.setSingleQPController('application', 'appomg', 'applol');
    this.setSingleQPController('index', 'omg', 'lol');

    this.add('route:application', Route.extend({
      model(params) {
        assert.deepEqual(params, { appomg: 'appyes' });
      }
    }));

    this.add('route:index', Route.extend({
      model(params) {
        assert.deepEqual(params, { omg: 'yes' });
        assert.deepEqual(this.paramsFor('application'), { appomg: 'appyes' });
      }
    }));

    return this.visitAndAssert('/?appomg=appyes&omg=yes');
  }

  ['@test can opt into full transition by setting refreshModel in route queryParams'](assert) {
    assert.expect(7);

    this.setSingleQPController('application', 'appomg', 'applol');
    this.setSingleQPController('index', 'omg', 'lol');

    let appModelCount = 0;
    this.add('route:application', Route.extend({
      model() {
        appModelCount++;
      }
    }));

    let indexModelCount = 0;
    this.add('route:index', Route.extend({
      queryParams: {
        omg: {
          refreshModel: true
        }
      },
      model(params) {
        indexModelCount++;

        if (indexModelCount === 1) {
          assert.deepEqual(params, { omg: 'lol' }, 'params are correct on first pass');
        } else if (indexModelCount === 2) {
          assert.deepEqual(params, { omg: 'lex' }, 'params are correct on second pass');
        }
      }
    }));

    return this.visitAndAssert('/').then(() => {
      assert.equal(appModelCount, 1, 'app model hook ran');
      assert.equal(indexModelCount, 1, 'index model hook ran');

      let indexController = this.getController('index');
      this.setAndFlush(indexController, 'omg', 'lex');

      assert.equal(appModelCount, 1, 'app model hook did not run again');
      assert.equal(indexModelCount, 2, 'index model hook ran again due to refreshModel');
    });
  }

  ['@test refreshModel and replace work together'](assert) {
    assert.expect(8);

    this.setSingleQPController('application', 'appomg', 'applol');
    this.setSingleQPController('index', 'omg', 'lol');

    let appModelCount = 0;
    this.add('route:application', Route.extend({
      model() {
        appModelCount++;
      }
    }));

    let indexModelCount = 0;
    this.add('route:index', Route.extend({
      queryParams: {
        omg: {
          refreshModel: true,
          replace: true
        }
      },
      model(params) {
        indexModelCount++;

        if (indexModelCount === 1) {
          assert.deepEqual(params, { omg: 'lol' }, 'params are correct on first pass');
        } else if (indexModelCount === 2) {
          assert.deepEqual(params, { omg: 'lex' }, 'params are correct on second pass');
        }
      }
    }));

    return this.visitAndAssert('/').then(() => {
      assert.equal(appModelCount, 1, 'app model hook ran');
      assert.equal(indexModelCount, 1, 'index model hook ran');

      let indexController = this.getController('index');
      this.expectedReplaceURL = '/?omg=lex';
      this.setAndFlush(indexController, 'omg', 'lex');

      assert.equal(appModelCount, 1, 'app model hook did not run again');
      assert.equal(indexModelCount, 2, 'index model hook ran again due to refreshModel');
    });
  }

  ['@test multiple QP value changes only cause a single model refresh'](assert) {
    assert.expect(2);

    this.setSingleQPController('index', 'alex', 'lol');
    this.setSingleQPController('index', 'steely', 'lel');

    let refreshCount = 0;
    this.add('route:index', Route.extend({
      queryParams: {
        alex: {
          refreshModel: true
        },
        steely: {
          refreshModel: true
        }
      },
      refresh() {
        refreshCount++;
      }
    }));

    return this.visitAndAssert('/').then(() => {
      let indexController = this.getController('index');
      run(indexController, 'setProperties', { alex: 'fran', steely: 'david' });
      assert.equal(refreshCount, 1, 'index refresh hook only run once');
    });
  }

  ['@test refreshModel does not cause a second transition during app boot '](assert) {
    assert.expect(1);

    this.setSingleQPController('application', 'appomg', 'applol');
    this.setSingleQPController('index', 'omg', 'lol');

    this.add('route:index', Route.extend({
      queryParams: {
        omg: {
          refreshModel: true
        }
      },
      refresh() {
        assert.ok(false);
      }
    }));

    return this.visitAndAssert('/?appomg=hello&omg=world');
  }

  ['@test queryParams are updated when a controller property is set and the route is refreshed. Issue #13263  '](assert) {
    this.addTemplate('application', '<button id="test-button" {{action \'increment\'}}>Increment</button><span id="test-value">{{foo}}</span>{{outlet}}');

    this.setSingleQPController('application', 'foo', 1, {
      actions: {
        increment() {
          this.incrementProperty('foo');
          this.send('refreshRoute');
        }
      }
    });

    this.add('route:application', Route.extend({
      actions: {
        refreshRoute() {
          this.refresh();
        }
      }
    }));

    return this.visitAndAssert('/').then(() => {
      assert.equal(jQuery('#test-value').text().trim(), '1');

      run(jQuery('#test-button'), 'click');
      assert.equal(jQuery('#test-value').text().trim(), '2');
      this.assertCurrentPath('/?foo=2');

      run(jQuery('#test-button'), 'click');
      assert.equal(jQuery('#test-value').text().trim(), '3');
      this.assertCurrentPath('/?foo=3');
    });
  }

  ['@test Use Ember.get to retrieve query params \'refreshModel\' configuration'](assert) {
    assert.expect(7);

    this.setSingleQPController('application', 'appomg', 'applol');
    this.setSingleQPController('index', 'omg', 'lol');

    let appModelCount = 0;
    this.add('route:application', Route.extend({
      model() {
        appModelCount++;
      }
    }));

    let indexModelCount = 0;
    this.add('route:index', Route.extend({
      queryParams: EmberObject.create({
        unknownProperty() {
          return { refreshModel: true };
        }
      }),
      model(params) {
        indexModelCount++;

        if (indexModelCount === 1) {
          assert.deepEqual(params, { omg: 'lol' });
        } else if (indexModelCount === 2) {
          assert.deepEqual(params, { omg: 'lex' });
        }
      }
    }));

    return this.visitAndAssert('/').then(() => {
      assert.equal(appModelCount, 1);
      assert.equal(indexModelCount, 1);

      let indexController = this.getController('index');
      this.setAndFlush(indexController, 'omg', 'lex');

      assert.equal(appModelCount, 1);
      assert.equal(indexModelCount, 2);
    });
  }

  ['@test can use refreshModel even with URL changes that remove QPs from address bar'](assert) {
    assert.expect(4);

    this.setSingleQPController('index', 'omg', 'lol');

    let indexModelCount = 0;
    this.add('route:index', Route.extend({
      queryParams: {
        omg: {
          refreshModel: true
        }
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
      }
    }));

    return this.visitAndAssert('/?omg=foo').then(() => {
      this.transitionTo('/');

      let indexController = this.getController('index');
      assert.equal(indexController.get('omg'), 'lol');
    });
  }

  ['@test can opt into a replace query by specifying replace:true in the Route config hash'](assert) {
    assert.expect(2);

    this.setSingleQPController('application', 'alex', 'matchneer');

    this.add('route:application', Route.extend({
      queryParams: {
        alex: {
          replace: true
        }
      }
    }));

    return this.visitAndAssert('/').then(() => {
      let appController = this.getController('application');
      this.expectedReplaceURL = '/?alex=wallace';
      this.setAndFlush(appController, 'alex', 'wallace');
    });
  }

  ['@test Route query params config can be configured using property name instead of URL key'](assert) {
    assert.expect(2);

    this.add('controller:application', Controller.extend({
      queryParams: [{ commitBy: 'commit_by' }]
    }));

    this.add('route:application', Route.extend({
      queryParams: {
        commitBy: {
          replace: true
        }
      }
    }));

    return this.visitAndAssert('/').then(() => {
      let appController = this.getController('application');
      this.expectedReplaceURL = '/?commit_by=igor_seb';
      this.setAndFlush(appController, 'commitBy', 'igor_seb');
    });
  }

  ['@test An explicit replace:false on a changed QP always wins and causes a pushState'](assert) {
    assert.expect(3);

    this.add('controller:application', Controller.extend({
      queryParams: ['alex', 'steely'],
      alex: 'matchneer',
      steely: 'dan'
    }));

    this.add('route:application', Route.extend({
      queryParams: {
        alex: {
          replace: true
        },
        steely: {
          replace: false
        }
      }
    }));

    return this.visit('/').then(() => {
      let appController = this.getController('application');
      this.expectedPushURL = '/?alex=wallace&steely=jan';
      run(appController, 'setProperties', { alex: 'wallace', steely: 'jan' });

      this.expectedPushURL = '/?alex=wallace&steely=fran';
      run(appController, 'setProperties', { steely: 'fran' });

      this.expectedReplaceURL = '/?alex=sriracha&steely=fran';
      run(appController, 'setProperties', { alex: 'sriracha' });
    });
  }

  ['@test can opt into full transition by setting refreshModel in route queryParams when transitioning from child to parent'](assert) {
    this.addTemplate('parent', '{{outlet}}');
    this.addTemplate('parent.child', '{{link-to \'Parent\' \'parent\' (query-params foo=\'change\') id=\'parent-link\'}}');

    this.router.map(function() {
      this.route('parent', function() {
        this.route('child');
      });
    });

    let parentModelCount = 0;
    this.add('route:parent', Route.extend({
      model() {
        parentModelCount++;
      },
      queryParams: {
        foo: {
          refreshModel: true
        }
      }
    }));

    this.setSingleQPController('parent', 'foo', 'abc');

    return this.visit('/parent/child?foo=lol').then(() => {
      assert.equal(parentModelCount, 1);

      run(jQuery('#parent-link'), 'click');
      assert.equal(parentModelCount, 2);
    });
  }

  ['@test Use Ember.get to retrieve query params \'replace\' configuration'](assert) {
    assert.expect(2);

    this.setSingleQPController('application', 'alex', 'matchneer');

    this.add('route:application', Route.extend({
      queryParams: EmberObject.create({
        unknownProperty() {
          // We are simulating all qps requiring refresh
          return { replace: true };
        }
      })
    }));

    return this.visitAndAssert('/').then(() => {
      let appController = this.getController('application');
      this.expectedReplaceURL = '/?alex=wallace';
      this.setAndFlush(appController, 'alex', 'wallace');
    });
  }

  ['@test can override incoming QP values in setupController'](assert) {
    assert.expect(3);

    this.router.map(function() {
      this.route('about');
    });

    this.setSingleQPController('index', 'omg', 'lol');

    this.add('route:index', Route.extend({
      setupController(controller) {
        assert.ok(true, 'setupController called');
        controller.set('omg', 'OVERRIDE');
      },
      actions: {
        queryParamsDidChange() {
          assert.ok(false, 'queryParamsDidChange shouldn\'t fire');
        }
      }
    }));

    return this.visitAndAssert('/about').then(() => {
      this.transitionTo('index');
      this.assertCurrentPath('/?omg=OVERRIDE');
    });
  }

  ['@test can override incoming QP array values in setupController'](assert) {
    assert.expect(3);

    this.router.map(function() {
      this.route('about');
    });

    this.setSingleQPController('index', 'omg', ['lol']);

    this.add('route:index', Route.extend({
      setupController(controller) {
        assert.ok(true, 'setupController called');
        controller.set('omg', ['OVERRIDE']);
      },
      actions: {
        queryParamsDidChange() {
          assert.ok(false, 'queryParamsDidChange shouldn\'t fire');
        }
      }
    }));

    return this.visitAndAssert('/about').then(() => {
      this.transitionTo('index');
      this.assertCurrentPath('/?omg=' + encodeURIComponent(JSON.stringify(['OVERRIDE'])));
    });
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

    this.router.map(function() {
      this.route('abc.def', { path: '/abcdef' }, function() {
        this.route('zoo');
      });
    });

    this.addTemplate('application', '{{link-to \'A\' \'abc.def\' (query-params foo=\'123\') id=\'one\'}}{{link-to \'B\' \'abc.def.zoo\' (query-params foo=\'123\' bar=\'456\') id=\'two\'}}{{outlet}}');

    this.setSingleQPController('abc.def', 'foo', 'lol');
    this.setSingleQPController('abc.def.zoo', 'bar', 'haha');

    return this.visitAndAssert('/').then(() => {
      assert.equal(jQuery('#one').attr('href'), '/abcdef?foo=123');
      assert.equal(jQuery('#two').attr('href'), '/abcdef/zoo?bar=456&foo=123');

      run(jQuery('#one'), 'click');
      this.assertCurrentPath('/abcdef?foo=123');

      run(jQuery('#two'), 'click');
      this.assertCurrentPath('/abcdef/zoo?bar=456&foo=123');
    });
  }

  ['@test transitionTo supports query params']() {
    this.setSingleQPController('index', 'foo', 'lol');

    return this.visitAndAssert('/').then(() => {
      this.transitionTo({ queryParams: { foo: 'borf' } });
      this.assertCurrentPath('/?foo=borf', 'shorthand supported');

      this.transitionTo({ queryParams: { 'index:foo': 'blaf' } });
      this.assertCurrentPath('/?foo=blaf', 'longform supported');

      this.transitionTo({ queryParams: { 'index:foo': false } });
      this.assertCurrentPath('/?foo=false', 'longform supported (bool)');

      this.transitionTo({ queryParams: { foo: false } });
      this.assertCurrentPath('/?foo=false', 'shorhand supported (bool)');
    });
  }

  ['@test transitionTo supports query params (multiple)']() {
    this.add('controller:index', Controller.extend({
      queryParams: ['foo', 'bar'],
      foo: 'lol',
      bar: 'wat'
    }));

    return this.visitAndAssert('/').then(() => {
      this.transitionTo({ queryParams: { foo: 'borf' } });
      this.assertCurrentPath('/?foo=borf', 'shorthand supported');

      this.transitionTo({ queryParams: { 'index:foo': 'blaf' } });
      this.assertCurrentPath('/?foo=blaf', 'longform supported');

      this.transitionTo({ queryParams: { 'index:foo': false } });
      this.assertCurrentPath('/?foo=false', 'longform supported (bool)');

      this.transitionTo({ queryParams: { foo: false } });
      this.assertCurrentPath('/?foo=false', 'shorhand supported (bool)');
    });
  }

  ['@test setting controller QP to empty string doesn\'t generate null in URL'](assert) {
    assert.expect(1);

    this.setSingleQPController('index', 'foo', '123');

    return this.visit('/').then(() => {
      let controller = this.getController('index');

      this.expectedPushURL = '/?foo=';
      this.setAndFlush(controller, 'foo', '');
    });
  }

  ['@test setting QP to empty string doesn\'t generate null in URL'](assert) {
    assert.expect(1);

    this.add('route:index', Route.extend({
      queryParams: {
        foo: {
          defaultValue: '123'
        }
      }
    }));

    return this.visit('/').then(() => {
      let controller = this.getController('index');

      this.expectedPushURL = '/?foo=';
      this.setAndFlush(controller, 'foo', '');
    });
  }

  ['@test A default boolean value deserializes QPs as booleans rather than strings'](assert) {
    assert.expect(3);

    this.setSingleQPController('index', 'foo', false);

    this.add('route:index', Route.extend({
      model(params) {
        assert.equal(params.foo, true, 'model hook received foo as boolean true');
      }
    }));

    return this.visit('/?foo=true').then(() => {
      let controller = this.getController('index');
      assert.equal(controller.get('foo'), true);

      this.transitionTo('/?foo=false');
      assert.equal(controller.get('foo'), false);
    });
  }

  ['@test Query param without value are empty string'](assert) {
    assert.expect(1);

    this.add('controller:index', Controller.extend({
      queryParams: ['foo'],
      foo: ''
    }));

    return this.visit('/?foo=').then(() => {
      let controller = this.getController('index');
      assert.equal(controller.get('foo'), '');
    });
  }

  ['@test Array query params can be set'](assert) {
    assert.expect(2);

    this.router.map(function() {
      this.route('home', { path: '/' });
    });

    this.setSingleQPController('home', 'foo', []);

    return this.visit('/').then(() => {
      let controller = this.getController('home');

      this.setAndFlush(controller, 'foo', [1, 2]);
      this.assertCurrentPath('/?foo=%5B1%2C2%5D');

      this.setAndFlush(controller, 'foo', [3, 4]);
      this.assertCurrentPath('/?foo=%5B3%2C4%5D');
    });
  }

  ['@test (de)serialization: arrays'](assert) {
    assert.expect(4);

    this.setSingleQPController('index', 'foo', [1]);

    return this.visitAndAssert('/').then(() => {
      this.transitionTo({ queryParams: { foo: [2, 3] } });
      this.assertCurrentPath('/?foo=%5B2%2C3%5D', 'shorthand supported');
      this.transitionTo({ queryParams: { 'index:foo': [4, 5] } });
      this.assertCurrentPath('/?foo=%5B4%2C5%5D', 'longform supported');
      this.transitionTo({ queryParams: { foo: [] } });
      this.assertCurrentPath('/?foo=%5B%5D', 'longform supported');
    });
  }

  ['@test Url with array query param sets controller property to array'](assert) {
    assert.expect(1);

    this.setSingleQPController('index', 'foo', '');

    return this.visit('/?foo[]=1&foo[]=2&foo[]=3').then(() => {
      let controller = this.getController('index');
      assert.deepEqual(controller.get('foo'), ['1', '2', '3']);
    });
  }

  ['@test Array query params can be pushed/popped'](assert) {
    assert.expect(17);

    this.router.map(function() {
      this.route('home', { path: '/' });
    });

    this.setSingleQPController('home', 'foo', emberA());

    return this.visitAndAssert('/').then(() => {
      let controller = this.getController('home');

      run(controller.foo, 'pushObject', 1);
      this.assertCurrentPath('/?foo=%5B1%5D');
      assert.deepEqual(controller.foo, [1]);

      run(controller.foo, 'popObject');
      this.assertCurrentPath('/');
      assert.deepEqual(controller.foo, []);

      run(controller.foo, 'pushObject', 1);
      this.assertCurrentPath('/?foo=%5B1%5D');
      assert.deepEqual(controller.foo, [1]);

      run(controller.foo, 'popObject');
      this.assertCurrentPath('/');
      assert.deepEqual(controller.foo, []);

      run(controller.foo, 'pushObject', 1);
      this.assertCurrentPath('/?foo=%5B1%5D');
      assert.deepEqual(controller.foo, [1]);

      run(controller.foo, 'pushObject', 2);
      this.assertCurrentPath('/?foo=%5B1%2C2%5D');
      assert.deepEqual(controller.foo, [1, 2]);

      run(controller.foo, 'popObject');
      this.assertCurrentPath('/?foo=%5B1%5D');
      assert.deepEqual(controller.foo, [1]);

      run(controller.foo, 'unshiftObject', 'lol');
      this.assertCurrentPath('/?foo=%5B%22lol%22%2C1%5D');
      assert.deepEqual(controller.foo, ['lol', 1]);
    });
  }

  ['@test Overwriting with array with same content shouldn\'t refire update'](assert) {
    assert.expect(4);

    this.router.map(function() {
      this.route('home', { path: '/' });
    });

    let modelCount = 0;
    this.add('route:home', Route.extend({
      model() {
        modelCount++;
      }
    }));

    this.setSingleQPController('home', 'foo', emberA([1]));

    return this.visitAndAssert('/').then(() => {
      assert.equal(modelCount, 1);

      let controller = this.getController('home');
      this.setAndFlush(controller, 'model', emberA([1]));

      assert.equal(modelCount, 1);
      this.assertCurrentPath('/');
    });
  }

  ['@test Defaulting to params hash as the model should not result in that params object being watched'](assert) {
    assert.expect(1);

    this.router.map(function() {
      this.route('other');
    });

    // This causes the params hash, which is returned as a route's
    // model if no other model could be resolved given the provided
    // params (and no custom model hook was defined), to be watched,
    // unless we return a copy of the params hash.
    this.setSingleQPController('application', 'woot', 'wat');

    this.add('route:other', Route.extend({
      model(p, trans) {
        let m = peekMeta(trans.params.application);
        assert.ok(m === undefined, 'A meta object isn\'t constructed for this params POJO');
      }
    }));

    return this.visit('/').then(() => {
      this.transitionTo('other');
    });
  }

  ['@test A child of a resource route still defaults to parent route\'s model even if the child route has a query param'](assert) {
    assert.expect(2);

    this.setSingleQPController('index', 'woot', undefined, {
      woot: undefined
    });

    this.add('route:application', Route.extend({
      model() {
        return { woot: true };
      }
    }));

    this.add('route:index', Route.extend({
      setupController(controller, model) {
        assert.deepEqual(model, { woot: true }, 'index route inherited model route from parent route');
      }
    }));

    return this.visitAndAssert('/');
  }

  ['@test opting into replace does not affect transitions between routes'](assert) {
    assert.expect(5);

    this.addTemplate('application', '{{link-to \'Foo\' \'foo\' id=\'foo-link\'}}{{link-to \'Bar\' \'bar\' id=\'bar-no-qp-link\'}}{{link-to \'Bar\' \'bar\' (query-params raytiley=\'isthebest\') id=\'bar-link\'}}{{outlet}}');

    this.router.map(function() {
      this.route('foo');
      this.route('bar');
    });

    this.setSingleQPController('bar', 'raytiley', 'israd');

    this.add('route:bar', Route.extend({
      queryParams: {
        raytiley: {
          replace: true
        }
      }
    }));

    return this.visit('/').then(() => {
      let controller = this.getController('bar');

      this.expectedPushURL = '/foo';
      run(jQuery('#foo-link'), 'click');

      this.expectedPushURL = '/bar';
      run(jQuery('#bar-no-qp-link'), 'click');

      this.expectedReplaceURL = '/bar?raytiley=woot';
      this.setAndFlush(controller, 'raytiley', 'woot');

      this.expectedPushURL = '/foo';
      run(jQuery('#foo-link'), 'click');

      this.expectedPushURL = '/bar?raytiley=isthebest';
      run(jQuery('#bar-link'), 'click');
    });
  }

  ['@test undefined isn\'t serialized or deserialized into a string'](assert) {
    assert.expect(4);

    this.router.map(function() {
      this.route('example');
    });

    this.addTemplate('application', '{{link-to \'Example\' \'example\' (query-params foo=undefined) id=\'the-link\'}}');

    this.setSingleQPController('example', 'foo', undefined, {
      foo: undefined
    });

    this.add('route:example', Route.extend({
      model(params) {
        assert.deepEqual(params, { foo: undefined });
      }
    }));

    return this.visitAndAssert('/').then(() => {
      assert.equal(this.$('#the-link').attr('href'), '/example', 'renders without undefined qp serialized');

      return this.transitionTo('example', { queryParams: { foo: undefined } }).then(() => {
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

  ['@test warn user that Route\'s queryParams configuration must be an Object, not an Array'](assert) {
    assert.expect(1);

    this.add('route:application', Route.extend({
      queryParams: [
        { commitBy: { replace: true } }
      ]
    }));

    expectAssertion(() => {
      this.visit('/');
    }, 'You passed in `[{"commitBy":{"replace":true}}]` as the value for `queryParams` but `queryParams` cannot be an Array');
  }

  ['@test handle route names that clash with Object.prototype properties'](assert) {
    assert.expect(1);

    this.router.map(function() {
      this.route('constructor');
    });

    this.add('route:constructor', Route.extend({
      queryParams: {
        foo: {
          defaultValue: '123'
        }
      }
    }));

    return this.visit('/').then(() => {
      this.transitionTo('constructor', { queryParams: { foo: '999' } });
      let controller = this.getController('constructor');
      assert.equal(get(controller, 'foo'), '999');
    });
  }
});
