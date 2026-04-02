import { subscribe, reset } from '@ember/instrumentation';
import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';
import { precompileTemplate } from '@ember/template-compilation';

moduleFor(
  'View Instrumentation',
  class extends ApplicationTestCase {
    constructor() {
      super();
      this.add('template:application', precompileTemplate(`{{outlet}}`));
      this.add('template:index', precompileTemplate(`<h1>Index</h1>`));
      this.add('template:posts', precompileTemplate(`<h1>Posts</h1>`));

      this.router.map(function () {
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
        after() {},
      });

      return this.visit('/')
        .then(() => {
          assert.equal(this.textValue(), 'Index', 'It rendered the correct template');

          assert.ok(called, 'Instrumentation called on first render');
          called = false;

          return this.visit('/posts');
        })
        .then(() => {
          assert.equal(this.textValue(), 'Posts', 'It rendered the correct template');
          assert.ok(called, 'Instrumentation called on transition to non-view backed route');
        });
    }
  }
);
