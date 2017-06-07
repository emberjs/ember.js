import {
  moduleFor,
  AutobootApplicationTestCase
} from 'internal-test-helpers';

import { run } from 'ember-metal';
import Test from '../test';
import QUnitAdapter from '../adapters/qunit';
import { Route } from 'ember-routing';
import { RSVP } from 'ember-runtime';

moduleFor('ember-testing Acceptance', class extends AutobootApplicationTestCase {
  constructor() {
    super();
    this._originalAdapter = Test.adapter;

    this.runTask(() => {
      this.createApplication();
      this.router.map(function() {
        this.route('posts');
        this.route('comments');

        this.route('abort_transition');

        this.route('redirect');
      });

      this.indexHitCount = 0;
      this.currentRoute = 'index';
      let testContext = this;

      this.add('route:index', Route.extend({
        model() {
          testContext.indexHitCount += 1;
        }
      }));

      this.add('route:posts', Route.extend({
        renderTemplate() {
          testContext.currentRoute = 'posts';
          this._super(...arguments);
        }
      }));

      this.addTemplate('posts', `
        <div class="posts-view">
          <a class="dummy-link"></a>
          <div id="comments-link">
            {{#link-to \'comments\'}}Comments{{/link-to}}
          </div>
        </div>
      `);

      this.add('route:comments', Route.extend({
        renderTemplate() {
          testContext.currentRoute = 'comments';
          this._super(...arguments);
        }
      }));

      this.addTemplate('comments', `<div>{{input type="text"}}</div>`);

      this.add('route:abort_transition', Route.extend({
        beforeModel(transition) {
          transition.abort();
        }
      }));

      this.add('route:redirect', Route.extend({
        beforeModel() {
          this.transitionTo('comments');
        }
      }));

      this.application.setupForTesting();

      Test.registerAsyncHelper('slowHelper', () => {
        return new RSVP.Promise(resolve => run.later(resolve, 10));
      });

      this.application.injectTestHelpers();
    });
  }

  teardown() {
    Test.adapter = this._originalAdapter;
    super.teardown();
  }

  [`@test helpers can be chained with then`](assert) {
    assert.expect(6);

    window.visit('/posts').then(() => {
      assert.equal(this.currentRoute, 'posts', 'Successfully visited posts route');
      assert.equal(window.currentURL(), '/posts', 'posts URL is correct');
      return window.click('a:contains("Comments")');
    }).then(() => {
      assert.equal(this.currentRoute, 'comments', 'visit chained with click');
      return window.fillIn('.ember-text-field', 'yeah');
    }).then(() => {
      assert.equal(this.$('.ember-text-field').val(), 'yeah', 'chained with fillIn');
      return window.fillIn('.ember-text-field', '#qunit-fixture', 'context working');
    }).then(() => {
      assert.equal(this.$('.ember-text-field').val(), 'context working', 'chained with fillIn');
      return window.click('.does-not-exist');
    }).catch(e => {
      assert.equal(e.message, 'Element .does-not-exist not found.', 'Non-existent click exception caught');
    });
  }

  [`@test helpers can be chained to each other (legacy)`](assert) {
    assert.expect(7);

    window.visit('/posts')
      .click('a:first', '#comments-link')
      .fillIn('.ember-text-field', 'hello')
      .then(() => {
        assert.equal(this.currentRoute, 'comments', 'Successfully visited comments route');
        assert.equal(window.currentURL(), '/comments', 'Comments URL is correct');
        assert.equal(this.$('.ember-text-field').val(), 'hello', 'Fillin successfully works');
        window.find('.ember-text-field').one('keypress', e => {
          assert.equal(e.keyCode, 13, 'keyevent chained with correct keyCode.');
          assert.equal(e.which, 13, 'keyevent chained with correct which.');
        });
      })
      .keyEvent('.ember-text-field', 'keypress', 13)
      .visit('/posts')
      .then(() => {
        assert.equal(this.currentRoute, 'posts', 'Thens can also be chained to helpers');
        assert.equal(window.currentURL(), '/posts', 'URL is set correct on chained helpers');
      });
  }

  [`@test helpers don't need to be chained`](assert) {
    assert.expect(5);

    window.visit('/posts');

    window.click('a:first', '#comments-link');

    window.fillIn('.ember-text-field', 'hello');

    window.andThen(() => {
      assert.equal(this.currentRoute, 'comments', 'Successfully visited comments route');
      assert.equal(window.currentURL(), '/comments', 'Comments URL is correct');
      assert.equal(window.find('.ember-text-field').val(), 'hello', 'Fillin successfully works');
    });

    window.visit('/posts');

    window.andThen(() => {
      assert.equal(this.currentRoute, 'posts');
      assert.equal(window.currentURL(), '/posts');
    });
  }

  [`@test Nested async helpers`](assert) {
    assert.expect(5);

    window.visit('/posts');

    window.andThen(() => {
      window.click('a:first', '#comments-link');
      window.fillIn('.ember-text-field', 'hello');
    });

    window.andThen(() => {
      assert.equal(this.currentRoute, 'comments', 'Successfully visited comments route');
      assert.equal(window.currentURL(), '/comments', 'Comments URL is correct');
      assert.equal(window.find('.ember-text-field').val(), 'hello', 'Fillin successfully works');
    });

    window.visit('/posts');

    window.andThen(() => {
      assert.equal(this.currentRoute, 'posts');
      assert.equal(window.currentURL(), '/posts');
    });
  }

  [`@test Multiple nested async helpers`](assert) {
    assert.expect(3);

    window.visit('/posts');

    window.andThen(() => {
      window.click('a:first', '#comments-link');

      window.fillIn('.ember-text-field', 'hello');
      window.fillIn('.ember-text-field', 'goodbye');
    });

    window.andThen(() => {
      assert.equal(window.find('.ember-text-field').val(), 'goodbye', 'Fillin successfully works');
      assert.equal(this.currentRoute, 'comments', 'Successfully visited comments route');
      assert.equal(window.currentURL(), '/comments', 'Comments URL is correct');
    });
  }

  [`@test Helpers nested in thens`](assert) {
    assert.expect(5);

    window.visit('/posts').then(() => {
      window.click('a:first', '#comments-link');
    });

    window.andThen(() => {
      window.fillIn('.ember-text-field', 'hello');
    });

    window.andThen(() => {
      assert.equal(this.currentRoute, 'comments', 'Successfully visited comments route');
      assert.equal(window.currentURL(), '/comments', 'Comments URL is correct');
      assert.equal(window.find('.ember-text-field').val(), 'hello', 'Fillin successfully works');
    });

    window.visit('/posts');

    window.andThen(() => {
      assert.equal(this.currentRoute, 'posts');
      assert.equal(window.currentURL(), '/posts', 'Posts URL is correct');
    });
  }

  [`@test Aborted transitions are not logged via Ember.Test.adapter#exception`](assert) {
    assert.expect(0);

    Test.adapter = QUnitAdapter.create({
      exception(error) {
        assert.ok(false, 'aborted transitions are not logged');
      }
    });

    window.visit('/abort_transition');
  }

  [`@test Unhandled exceptions are logged via Ember.Test.adapter#exception`](assert) {
    assert.expect(2);

    let asyncHandled;
    Test.adapter = QUnitAdapter.create({
      exception(error) {
        assert.equal(
          error.message, 'Element .does-not-exist not found.',
          'Exception successfully caught and passed to Ember.Test.adapter.exception'
        );
        // handle the rejection so it doesn't leak later.
        asyncHandled.catch(() => { });
      }
    });

    window.visit('/posts');

    window.click('.invalid-element').catch(error => {
      assert.equal(
        error.message, 'Element .invalid-element not found.',
        'Exception successfully handled in the rejection handler'
      );
    });

    asyncHandled = window.click('.does-not-exist');
  }

  [`@test Unhandled exceptions in 'andThen' are logged via Ember.Test.adapter#exception`](assert) {
    assert.expect(1);

    Test.adapter = QUnitAdapter.create({
      exception(error) {
        assert.equal(
          error.message, 'Catch me',
          'Exception successfully caught and passed to Ember.Test.adapter.exception'
        );
      }
    });

    window.visit('/posts');

    window.andThen(() => {
      throw new Error('Catch me');
    });
  }

  [`@test should not start routing on the root URL when visiting another`](assert) {
    assert.expect(4);

    window.visit('/posts');

    window.andThen(() => {
      assert.ok(window.find('#comments-link'), 'found comments-link');
      assert.equal(this.currentRoute, 'posts', 'Successfully visited posts route');
      assert.equal(window.currentURL(), '/posts', 'Posts URL is correct');
      assert.equal(this.indexHitCount, 0, 'should not hit index route when visiting another route');
    });
  }

  [`@test only enters the index route once when visiting `](assert) {
    assert.expect(1);

    window.visit('/');

    window.andThen(() => {
      assert.equal(this.indexHitCount, 1, 'should hit index once when visiting /');
    });
  }

  [`@test test must not finish while asyncHelpers are pending`](assert) {
    assert.expect(2);

    let async = 0;
    let innerRan = false;

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

    this.application.testHelpers.slowHelper();

    window.andThen(() => {
      innerRan = true;
    });

    assert.equal(innerRan, false, 'should not have run yet');
    assert.ok(async > 0, 'should have told the adapter to pause');

    if (async === 0) {
      // If we failed the test, prevent zalgo from escaping and breaking
      // our other tests.
      Test.adapter.asyncStart();
      Test.resolve().then(() => {
        Test.adapter.asyncEnd();
      });
    }
  }

  [`@test visiting a URL that causes another transition should yield the correct URL`](assert) {
    assert.expect(1);

    window.visit('/redirect');

    window.andThen(() => {
      assert.equal(window.currentURL(), '/comments', 'Redirected to Comments URL');
    });
  }

  [`@test visiting a URL and then visiting a second URL with a transition should yield the correct URL`](assert) {
    assert.expect(2);

    window.visit('/posts');

    window.andThen(function () {
      assert.equal(window.currentURL(), '/posts', 'First visited URL is correct');
    });

    window.visit('/redirect');

    window.andThen(() => {
      assert.equal(window.currentURL(), '/comments', 'Redirected to Comments URL');
    });
  }

});

moduleFor('ember-testing Acceptance - teardown', class extends AutobootApplicationTestCase {

  [`@test that the setup/teardown happens correctly`](assert) {
    assert.expect(2);

    this.runTask(() => {
      this.createApplication();
    });
    this.application.injectTestHelpers();

    assert.ok(typeof Test.Promise.prototype.click === 'function');

    this.runTask(() => {
      this.application.destroy();
    });

    assert.equal(Test.Promise.prototype.click, undefined);
  }

});
