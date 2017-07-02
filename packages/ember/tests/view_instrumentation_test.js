import {
  instrumentationSubscribe as subscribe,
  instrumentationReset as reset
} from 'ember-metal';
import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';

moduleFor('View Instrumentation', class extends ApplicationTestCase {
  constructor() {
    super();
    this.addTemplate('application', `{{outlet}}`);
    this.addTemplate('index', `<h1>Index</h1>`);
    this.addTemplate('posts', `<h1>Posts</h1>`);

    this.router.map(function() {
      this.route('posts');
    });
  }
  teardown() {
    reset();
    super.teardown();
  }

  ['@test Nodes without view instances are instrumented'](assert) {
    let called = false;

    subscribe('render', {
      before() {
        called = true;
      },
      after() {}
    });

    return this.visit('/').then(() => {
      assert.equal(this.textValue(),
        'Index',
        'It rendered the correct template'
      );

      assert.ok(called, 'Instrumentation called on first render');
      called = false;

      return this.visit('/posts');
    }).then(() => {
      assert.equal(this.textValue(),
      'Posts',
      'It rendered the correct template'
      );
      assert.ok(called,
        'Instrumentation called on transition to non-view backed route'
      );
    });
  }
});
