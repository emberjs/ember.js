import run from "ember-metal/run_loop";
import { forEach } from "ember-metal/array";
import Application from "ember-application/system/application";

var application, registry;

QUnit.module("Ember.Application Dependency Injection – normalization", {
  setup() {
    application = run(Application, 'create');
    registry = application.registry;
  },

  teardown() {
    run(application, 'destroy');
  }
});

QUnit.test('normalization', function() {
  ok(registry.normalize, 'registry#normalize is present');

  equal(registry.normalize('foo:bar'), 'foo:bar');

  equal(registry.normalize('controller:posts'), 'controller:posts');
  equal(registry.normalize('controller:posts_index'), 'controller:postsIndex');
  equal(registry.normalize('controller:posts.index'), 'controller:postsIndex');
  equal(registry.normalize('controller:posts.post.index'), 'controller:postsPostIndex');
  equal(registry.normalize('controller:posts_post.index'), 'controller:postsPostIndex');
  equal(registry.normalize('controller:posts.post_index'), 'controller:postsPostIndex');
  equal(registry.normalize('controller:postsIndex'), 'controller:postsIndex');
  equal(registry.normalize('controller:blogPosts.index'), 'controller:blogPostsIndex');
  equal(registry.normalize('controller:blog/posts.index'), 'controller:blog/postsIndex');
  equal(registry.normalize('controller:blog/posts.post.index'), 'controller:blog/postsPostIndex');
  equal(registry.normalize('controller:blog/posts_post.index'), 'controller:blog/postsPostIndex');

  equal(registry.normalize('template:blog/posts_index'), 'template:blog/posts_index');
});

QUnit.test('normalization is indempotent', function() {
  var examples = ['controller:posts', 'controller:posts.post.index', 'controller:blog/posts.post_index', 'template:foo_bar'];

  forEach.call(examples, function (example) {
    equal(registry.normalize(registry.normalize(example)), registry.normalize(example));
  });
});
