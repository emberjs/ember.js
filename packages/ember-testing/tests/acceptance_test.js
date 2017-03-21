import { run } from 'ember-metal';
import { jQuery } from 'ember-views';
import Test from '../test';
import QUnitAdapter from '../adapters/qunit';
import '../initializers'; // ensure the initializer is setup
import { Application as EmberApplication } from 'ember-application';
import { Route as EmberRoute } from 'ember-routing';
import { RSVP } from 'ember-runtime';
import TestResolver from 'internal-test-helpers';

//ES6TODO: we need {{link-to}}  and {{outlet}} to exist here

var App, find, click, fillIn, currentRoute, currentURL, visit, originalAdapter, andThen, indexHitCount;

QUnit.module('ember-testing Acceptance', {
  setup() {
    jQuery('<style>#ember-testing-container { position: absolute; background: white; bottom: 0; right: 0; width: 640px; height: 384px; overflow: auto; z-index: 9999; border: 1px solid #ccc; } #ember-testing { zoom: 50%; }</style>').appendTo('head');
    jQuery('<div id="ember-testing-container"><div id="ember-testing"></div></div>').appendTo('body');

    originalAdapter = Test.adapter;

    run(function() {
      indexHitCount = 0;

      App = EmberApplication.create({
        rootElement: '#ember-testing',
        Resolver: TestResolver
      });

      App.Router.map(function() {
        this.route('posts');
        this.route('comments');

        this.route('abort_transition');

        this.route('redirect');
      });

      let resolver = TestResolver.lastInstance;

      resolver.add('route:index', EmberRoute.extend({
        model() {
          indexHitCount += 1;
        }
      }));

      resolver.add('route:posts', EmberRoute.extend({
        renderTemplate() {
          currentRoute = 'posts';
          this._super(...arguments);
        }
      }));

      resolver.addTemplate('posts', '<div class="posts-view"><a class="dummy-link"></a><div id="comments-link">{{#link-to \'comments\'}}Comments{{/link-to}}</div></div>');

      resolver.add('route:comments', EmberRoute.extend({
        renderTemplate() {
          currentRoute = 'comments';
          this._super(...arguments);
        }
      }));

      resolver.addTemplate('comments', '<div>{{input type="text"}}</div>');

      resolver.add('route:abort_transition', EmberRoute.extend({
        beforeModel(transition) {
          transition.abort();
        }
      }));

      resolver.add('route:redirect', EmberRoute.extend({
        beforeModel() {
          this.transitionTo('comments');
        }
      }));

      App.setupForTesting();
    });

    Test.registerAsyncHelper('slowHelper', function() {
      return new RSVP.Promise(function(resolve) {
        setTimeout(resolve, 10);
      });
    });

    App.injectTestHelpers();

    find = window.find;
    click = window.click;
    fillIn = window.fillIn;
    visit = window.visit;
    andThen = window.andThen;
    currentURL = window.currentURL;
  },

  teardown() {
    Test.unregisterHelper('slowHelper');
    jQuery('#ember-testing-container, #ember-testing').remove();
    run(App, App.destroy);
    App = null;
    Test.adapter = originalAdapter;
    indexHitCount = 0;
  }
});

QUnit.test('helpers can be chained with then', function() {
  expect(6);

  currentRoute = 'index';

  visit('/posts').then(function() {
    equal(currentRoute, 'posts', 'Successfully visited posts route');
    equal(currentURL(), '/posts', 'posts URL is correct');
    return click('a:contains("Comments")');
  }).then(function() {
    equal(currentRoute, 'comments', 'visit chained with click');
    return fillIn('.ember-text-field', 'yeah');
  }).then(function() {
    equal(jQuery('.ember-text-field').val(), 'yeah', 'chained with fillIn');
    return fillIn('.ember-text-field', '#ember-testing-container', 'context working');
  }).then(function() {
    equal(jQuery('.ember-text-field').val(), 'context working', 'chained with fillIn');
    return click('.does-not-exist');
  }).then(null, function(e) {
    equal(e.message, 'Element .does-not-exist not found.', 'Non-existent click exception caught');
  });
});



// Keep this for backwards compatibility

QUnit.test('helpers can be chained to each other', function() {
  expect(7);

  currentRoute = 'index';

  visit('/posts')
  .click('a:first', '#comments-link')
  .fillIn('.ember-text-field', 'hello')
  .then(function() {
    equal(currentRoute, 'comments', 'Successfully visited comments route');
    equal(currentURL(), '/comments', 'Comments URL is correct');
    equal(jQuery('.ember-text-field').val(), 'hello', 'Fillin successfully works');
    find('.ember-text-field').one('keypress', function(e) {
      equal(e.keyCode, 13, 'keyevent chained with correct keyCode.');
      equal(e.which, 13, 'keyevent chained with correct which.');
    });
  })
  .keyEvent('.ember-text-field', 'keypress', 13)
  .visit('/posts')
  .then(function() {
    equal(currentRoute, 'posts', 'Thens can also be chained to helpers');
    equal(currentURL(), '/posts', 'URL is set correct on chained helpers');
  });
});

QUnit.test('helpers don\'t need to be chained', function() {
  expect(5);

  currentRoute = 'index';

  visit('/posts');

  click('a:first', '#comments-link');

  fillIn('.ember-text-field', 'hello');

  andThen(function() {
    equal(currentRoute, 'comments', 'Successfully visited comments route');
    equal(currentURL(), '/comments', 'Comments URL is correct');
    equal(find('.ember-text-field').val(), 'hello', 'Fillin successfully works');
  });

  visit('/posts');

  andThen(function() {
    equal(currentRoute, 'posts');
    equal(currentURL(), '/posts');
  });
});

QUnit.test('Nested async helpers', function() {
  expect(5);

  currentRoute = 'index';

  visit('/posts');

  andThen(function() {
    click('a:first', '#comments-link');

    fillIn('.ember-text-field', 'hello');
  });

  andThen(function() {
    equal(currentRoute, 'comments', 'Successfully visited comments route');
    equal(currentURL(), '/comments', 'Comments URL is correct');
    equal(find('.ember-text-field').val(), 'hello', 'Fillin successfully works');
  });

  visit('/posts');

  andThen(function() {
    equal(currentRoute, 'posts');
    equal(currentURL(), '/posts');
  });
});

QUnit.test('Multiple nested async helpers', function() {
  expect(3);

  visit('/posts');

  andThen(function() {
    click('a:first', '#comments-link');

    fillIn('.ember-text-field', 'hello');
    fillIn('.ember-text-field', 'goodbye');
  });

  andThen(function() {
    equal(find('.ember-text-field').val(), 'goodbye', 'Fillin successfully works');
    equal(currentRoute, 'comments', 'Successfully visited comments route');
    equal(currentURL(), '/comments', 'Comments URL is correct');
  });
});

QUnit.test('Helpers nested in thens', function() {
  expect(5);

  currentRoute = 'index';

  visit('/posts').then(function() {
    click('a:first', '#comments-link');
  });

  andThen(function() {
    fillIn('.ember-text-field', 'hello');
  });

  andThen(function() {
    equal(currentRoute, 'comments', 'Successfully visited comments route');
    equal(currentURL(), '/comments', 'Comments URL is correct');
    equal(find('.ember-text-field').val(), 'hello', 'Fillin successfully works');
  });

  visit('/posts');

  andThen(function() {
    equal(currentRoute, 'posts');
    equal(currentURL(), '/posts', 'Posts URL is correct');
  });
});

QUnit.test('Aborted transitions are not logged via Ember.Test.adapter#exception', function () {
  expect(0);

  Test.adapter = QUnitAdapter.create({
    exception(error) {
      ok(false, 'aborted transitions are not logged');
    }
  });

  visit('/abort_transition');
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

  visit('/posts');

  click('.invalid-element').then(null, function(error) {
    equal(error.message, 'Element .invalid-element not found.', 'Exception successfully handled in the rejection handler');
  });

  asyncHandled = click('.does-not-exist');
});

QUnit.test('Unhandled exceptions in `andThen` are logged via Ember.Test.adapter#exception', function () {
  expect(1);

  Test.adapter = QUnitAdapter.create({
    exception(error) {
      equal(error.message, 'Catch me', 'Exception successfully caught and passed to Ember.Test.adapter.exception');
    }
  });

  visit('/posts');

  andThen(function() {
    throw new Error('Catch me');
  });
});

QUnit.test('should not start routing on the root URL when visiting another', function() {
  expect(4);

  visit('/posts');

  andThen(function() {
    ok(find('#comments-link'), 'found comments-link');
    equal(currentRoute, 'posts', 'Successfully visited posts route');
    equal(currentURL(), '/posts', 'Posts URL is correct');
    equal(indexHitCount, 0, 'should not hit index route when visiting another route');
  });
});

QUnit.test('only enters the index route once when visiting /', function() {
  expect(1);

  visit('/');

  andThen(function() {
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

  App.testHelpers.slowHelper();
  andThen(function() {
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

QUnit.test('visiting a URL that causes another transition should yield the correct URL', function () {
  expect(1);

  visit('/redirect');

  andThen(function () {
    equal(currentURL(), '/comments', 'Redirected to Comments URL');
  });
});

QUnit.test('visiting a URL and then visiting a second URL with a transition should yield the correct URL', function () {
  expect(2);

  visit('/posts');

  andThen(function () {
    equal(currentURL(), '/posts', 'First visited URL is correct');
  });

  visit('/redirect');

  andThen(function () {
    equal(currentURL(), '/comments', 'Redirected to Comments URL');
  });
});

QUnit.module('ember-testing Acceptance – teardown');

QUnit.test('that the setup/teardown happens correct', function() {
  expect(2);

  jQuery('<style>#ember-testing-container { position: absolute; background: white; bottom: 0; right: 0; width: 640px; height: 384px; overflow: auto; z-index: 9999; border: 1px solid #ccc; } #ember-testing { zoom: 50%; }</style>').appendTo('head');
  jQuery('<div id="ember-testing-container"><div id="ember-testing"></div></div>').appendTo('body');

  run(function() {
    indexHitCount = 0;
    App = EmberApplication.create({
      rootElement: '#ember-testing'
    });
  });
  App.injectTestHelpers();

  jQuery('#ember-testing-container, #ember-testing').remove();
  ok(typeof Test.Promise.prototype.click === 'function');
  run(App, App.destroy);
  equal(Test.Promise.prototype.click, undefined);
  App = null;
  Test.adapter = originalAdapter;
  indexHitCount = 0;
});
