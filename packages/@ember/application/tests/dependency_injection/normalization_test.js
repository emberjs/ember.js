import { run } from '@ember/runloop';
import Application from '@ember/application';
import { moduleFor, AbstractTestCase as TestCase } from 'internal-test-helpers';

let application, registry;

moduleFor(
  'Application Dependency Injection - normalize',
  class extends TestCase {
    constructor() {
      super();

      application = run(Application, 'create');
      registry = application.__registry__;
    }

    teardown() {
      super.teardown();
      run(application, 'destroy');
      application = undefined;
      registry = undefined;
    }

    ['@test normalization'](assert) {
      assert.ok(registry.normalize, 'registry#normalize is present');

      assert.equal(registry.normalize('foo:bar'), 'foo:bar');

      assert.equal(registry.normalize('controller:posts'), 'controller:posts');
      assert.equal(registry.normalize('controller:posts_index'), 'controller:postsIndex');
      assert.equal(registry.normalize('controller:posts.index'), 'controller:postsIndex');
      assert.equal(registry.normalize('controller:posts-index'), 'controller:postsIndex');
      assert.equal(registry.normalize('controller:posts.post.index'), 'controller:postsPostIndex');
      assert.equal(registry.normalize('controller:posts_post.index'), 'controller:postsPostIndex');
      assert.equal(registry.normalize('controller:posts.post_index'), 'controller:postsPostIndex');
      assert.equal(registry.normalize('controller:posts.post-index'), 'controller:postsPostIndex');
      assert.equal(registry.normalize('controller:postsIndex'), 'controller:postsIndex');
      assert.equal(registry.normalize('controller:blogPosts.index'), 'controller:blogPostsIndex');
      assert.equal(registry.normalize('controller:blog/posts.index'), 'controller:blog/postsIndex');
      assert.equal(registry.normalize('controller:blog/posts-index'), 'controller:blog/postsIndex');
      assert.equal(
        registry.normalize('controller:blog/posts.post.index'),
        'controller:blog/postsPostIndex'
      );
      assert.equal(
        registry.normalize('controller:blog/posts_post.index'),
        'controller:blog/postsPostIndex'
      );
      assert.equal(
        registry.normalize('controller:blog/posts_post-index'),
        'controller:blog/postsPostIndex'
      );

      assert.equal(registry.normalize('template:blog/posts_index'), 'template:blog/posts_index');
    }

    ['@test normalization is indempotent'](assert) {
      let examples = [
        'controller:posts',
        'controller:posts.post.index',
        'controller:blog/posts.post_index',
        'template:foo_bar',
      ];

      examples.forEach(example => {
        assert.equal(registry.normalize(registry.normalize(example)), registry.normalize(example));
      });
    }
  }
);
