import run from 'ember-metal/run_loop';
import jQuery from 'ember-views/system/jquery';
import Test from 'ember-testing/test';
import QUnitAdapter from 'ember-testing/adapters/qunit';
import EmberView from 'ember-views/views/view';
import 'ember-testing/initializers'; // ensure the initializer is setup
import EmberApplication from 'ember-application/system/application';
import EmberRoute from 'ember-routing/system/route';
import EmberRouter from 'ember-routing/system/router';
import compile from 'ember-template-compiler/system/compile';
import RSVP from 'ember-runtime/ext/rsvp';
import isEnabled from 'ember-metal/features';

//ES6TODO: we need {{link-to}}  and {{outlet}} to exist here
import 'ember-routing'; //ES6TODO: fixme?

var App, instance, indexHitCount, currentRoute;
var testIndex = 0;

function setupApp() {
  jQuery('<style>#ember-testing-container { position: absolute; background: white; bottom: 0; right: 0; width: 640px; height: 384px; overflow: auto; z-index: 9999; border: 1px solid #ccc; } #ember-testing { zoom: 50%; }</style>').appendTo('head');
  jQuery('<div id="ember-testing-container"><div id="ember-testing"></div></div>').appendTo('body');
  run(function() {
    indexHitCount = 0;

    App = EmberApplication.create({
      rootElement: '#ember-testing',
      autoboot: false
    });

    App.Router = EmberRouter.extend();
    App.Router.map(function() {
      this.route('posts');
      this.route('comments');
      this.route('abort_transition');
      this.route('redirect');
    });

    App.IndexRoute = EmberRoute.extend({
      model() {
        indexHitCount += 1;
      }
    });

    App.PostsRoute = EmberRoute.extend({
      renderTemplate() {
        currentRoute = 'posts';
        this._super.apply(this, arguments);
      }
    });

    App.PostsView = EmberView.extend({
      defaultTemplate: compile('<a class="dummy-link"></a><div id="comments-link">{{#link-to \'comments\'}}Comments{{/link-to}}</div>'),
      classNames: ['posts-view']
    });

    App.CommentsRoute = EmberRoute.extend({
      renderTemplate() {
        currentRoute = 'comments';
        this._super.apply(this, arguments);
      }
    });

    App.CommentsView = EmberView.extend({
      defaultTemplate: compile('{{input type="text"}}')
    });

    App.AbortTransitionRoute = EmberRoute.extend({
      beforeModel(transition) {
        transition.abort();
      }
    });

    App.RedirectRoute = EmberRoute.extend({
      beforeModel() {
        this.transitionTo('comments');
      }
    });

    App.setupForTesting();
  });
}

if (isEnabled('ember-testing-instances')) {
  QUnit.module('ember-testing Acceptance - instance', {
    setup() {
      if (!App) { setupApp(); }

      Test.registerAsyncHelper('slowHelper', function() {
        return new RSVP.Promise(function(resolve) {
          setTimeout(resolve, 10);
        });
      });

      instance = run(App, 'buildTestInstance');
    },

    teardown() {
      Test.unregisterHelper('slowHelper');

      run(instance, 'destroy');
      instance = null;

      indexHitCount = 0;

      // After the last test, teardown the application and DOM
      if (++testIndex === QUnit.config.previousModule.tests.length) {
        jQuery('#ember-testing-container, #ember-testing').remove();

        run(App, App.destroy);
        App = null;
      }
    }
  });

  QUnit.test('helpers can be chained with then', function() {
    expect(6);

    currentRoute = 'index';

    instance.testHelpers.visit('/posts').then(function() {
      equal(currentRoute, 'posts', 'Successfully visited posts route');
      equal(instance.testHelpers.currentURL(), '/posts', 'posts URL is correct');
      return instance.testHelpers.click('a:contains("Comments")');
    }).then(function() {
      equal(currentRoute, 'comments', 'visit chained with click');
      return instance.testHelpers.fillIn('.ember-text-field', 'yeah');
    }).then(function() {
      equal(jQuery('.ember-text-field').val(), 'yeah', 'chained with fillIn');
      return instance.testHelpers.fillIn('.ember-text-field', '#ember-testing-container', 'context working');
    }).then(function() {
      equal(jQuery('.ember-text-field').val(), 'context working', 'chained with fillIn');
      return instance.testHelpers.click('.does-not-exist');
    }).then(null, function(e) {
      equal(e.message, 'Element .does-not-exist not found.', 'Non-existent click exception caught');
    });
  });

  QUnit.test('helpers don\'t need to be chained', function() {
    expect(5);

    currentRoute = 'index';

    instance.testHelpers.visit('/posts');

    instance.testHelpers.click('a:first', '#comments-link');

    instance.testHelpers.fillIn('.ember-text-field', 'hello');

    instance.testHelpers.andThen(function() {
      equal(currentRoute, 'comments', 'Successfully visited comments route');
      equal(instance.testHelpers.currentURL(), '/comments', 'Comments URL is correct');
      equal(instance.testHelpers.find('.ember-text-field').val(), 'hello', 'Fillin successfully works');
    });

    instance.testHelpers.visit('/posts');

    instance.testHelpers.andThen(function() {
      equal(currentRoute, 'posts');
      equal(instance.testHelpers.currentURL(), '/posts');
    });
  });

  QUnit.test('Nested async helpers', function() {
    expect(5);

    currentRoute = 'index';

    instance.testHelpers.visit('/posts');

    instance.testHelpers.andThen(function() {
      instance.testHelpers.click('a:first', '#comments-link');

      instance.testHelpers.fillIn('.ember-text-field', 'hello');
    });

    instance.testHelpers.andThen(function() {
      equal(currentRoute, 'comments', 'Successfully visited comments route');
      equal(instance.testHelpers.currentURL(), '/comments', 'Comments URL is correct');
      equal(instance.testHelpers.find('.ember-text-field').val(), 'hello', 'Fillin successfully works');
    });

    instance.testHelpers.visit('/posts');

    instance.testHelpers.andThen(function() {
      equal(currentRoute, 'posts');
      equal(instance.testHelpers.currentURL(), '/posts');
    });
  });

  QUnit.test('Multiple nested async helpers', function() {
    expect(3);

    instance.testHelpers.visit('/posts');

    instance.testHelpers.andThen(function() {
      instance.testHelpers.click('a:first', '#comments-link');

      instance.testHelpers.fillIn('.ember-text-field', 'hello');
      instance.testHelpers.fillIn('.ember-text-field', 'goodbye');
    });

    instance.testHelpers.andThen(function() {
      equal(instance.testHelpers.find('.ember-text-field').val(), 'goodbye', 'Fillin successfully works');
      equal(currentRoute, 'comments', 'Successfully visited comments route');
      equal(instance.testHelpers.currentURL(), '/comments', 'Comments URL is correct');
    });
  });

  QUnit.test('Helpers nested in thens', function() {
    expect(5);

    currentRoute = 'index';

    instance.testHelpers.visit('/posts').then(function() {
      instance.testHelpers.click('a:first', '#comments-link');
    });

    instance.testHelpers.andThen(function() {
      instance.testHelpers.fillIn('.ember-text-field', 'hello');
    });

    instance.testHelpers.andThen(function() {
      equal(currentRoute, 'comments', 'Successfully visited comments route');
      equal(instance.testHelpers.currentURL(), '/comments', 'Comments URL is correct');
      equal(instance.testHelpers.find('.ember-text-field').val(), 'hello', 'Fillin successfully works');
    });

    instance.testHelpers.visit('/posts');

    instance.testHelpers.andThen(function() {
      equal(currentRoute, 'posts');
      equal(instance.testHelpers.currentURL(), '/posts', 'Posts URL is correct');
    });
  });

  QUnit.test('Unhandled exceptions are logged via Ember.Test.adapter#exception', function () {
    expect(2);

    var asyncHandled;
    Test.adapter = QUnitAdapter.create({
      exception(error) {
        equal(error.message, 'Element .does-not-exist not found.', 'Exception successfully caught and passed to Ember.Test.adapter.exception');
        asyncHandled['catch'](function() { }); // handle the rejection so it doesn't leak later.
      }
    });

    instance.testHelpers.visit('/posts');

    instance.testHelpers.click('.invalid-element').then(null, function(error) {
      equal(error.message, 'Element .invalid-element not found.', 'Exception successfully handled in the rejection handler');
    });

    asyncHandled = instance.testHelpers.click('.does-not-exist');
  });

  QUnit.test('Unhandled exceptions in `andThen` are logged via Ember.Test.adapter#exception', function () {
    expect(1);

    Test.adapter = QUnitAdapter.create({
      exception(error) {
        equal(error.message, 'Catch me', 'Exception successfully caught and passed to Ember.Test.adapter.exception');
      }
    });

    instance.testHelpers.visit('/posts');

    instance.testHelpers.andThen(function() {
      throw new Error('Catch me');
    });
  });

  QUnit.test('should not start routing on the root URL when visiting another', function() {
    expect(4);

    instance.testHelpers.visit('/posts');

    instance.testHelpers.andThen(function() {
      ok(instance.testHelpers.find('#comments-link'), 'found comments-link');
      equal(currentRoute, 'posts', 'Successfully visited posts route');
      equal(instance.testHelpers.currentURL(), '/posts', 'Posts URL is correct');
      equal(indexHitCount, 0, 'should not hit index route when visiting another route');
    });
  });

  QUnit.test('only enters the index route once when visiting /', function() {
    expect(1);

    instance.testHelpers.visit('/');

    instance.testHelpers.andThen(function() {
      equal(indexHitCount, 1, 'should hit index once when visiting /');
    });
  });

  QUnit.test('test must not finish while asyncHelpers are pending', function () {
    expect(2);

    var async = 0;
    var innerRan = false;

    Test.adapter = QUnitAdapter.extend({
      asyncStart() {
        async++;
        this._super();
      },
      asyncEnd() {
        async--;
        this._super();
      }
    }).create();

    instance.testHelpers.slowHelper();
    instance.testHelpers.andThen(function() {
      innerRan = true;
    });


    equal(innerRan, false, 'should not have run yet');
    ok(async > 0, 'should have told the adapter to pause');

    if (async === 0) {
      // If we failed the test, prevent zalgo from escaping and breaking
      // our other tests.
      Test.adapter.asyncStart();
      Test.resolve().then(function() {
        Test.adapter.asyncEnd();
      });
    }
  });

  QUnit.test('visiting a URL and then visiting a second URL with a transition should yield the correct URL', function () {
    expect(2);

    instance.testHelpers.visit('/posts');

    instance.testHelpers.andThen(function () {
      equal(instance.testHelpers.currentURL(), '/posts', 'First visited URL is correct');
    });

    instance.testHelpers.visit('/redirect');

    instance.testHelpers.andThen(function () {
      equal(instance.testHelpers.currentURL(), '/comments', 'Redirected to Comments URL');
    });
  });
}
