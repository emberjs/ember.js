var application, locator, forEach = Ember.ArrayPolyfills.forEach;

module("Ember.Application Depedency Injection – normalization", {
  setup: function() {
    application = Ember.run(Ember.Application, 'create');
    locator = application.__container__;
  },

  teardown: function() {
    Ember.run(application, 'destroy');
  }
});

test('normalization', function() {
  ok(locator.normalize, 'locator#normalize is present');

  equal(locator.normalize('foo:bar'), 'foo:bar');

  equal(locator.normalize('controller:posts'), 'controller:posts');
  equal(locator.normalize('controller:posts_index'), 'controller:postsIndex');
  equal(locator.normalize('controller:posts.index'), 'controller:postsIndex');
  equal(locator.normalize('controller:posts.post.index'), 'controller:postsPostIndex');
  equal(locator.normalize('controller:posts_post.index'), 'controller:postsPostIndex');
  equal(locator.normalize('controller:posts.post_index'), 'controller:postsPostIndex');
  equal(locator.normalize('controller:postsIndex'), 'controller:postsIndex');
  equal(locator.normalize('controller:blogPosts.index'), 'controller:blogPostsIndex');
  equal(locator.normalize('controller:blog/posts.index'), 'controller:blog/postsIndex');
  equal(locator.normalize('controller:blog/posts.post.index'), 'controller:blog/postsPostIndex');
  equal(locator.normalize('controller:blog/posts_post.index'), 'controller:blog/postsPostIndex');

  equal(locator.normalize('template:blog/posts_index'), 'template:blog/posts_index');
});

test('normalization is indempotent', function() {
  var examples = ['controller:posts', 'controller:posts.post.index', 'controller:blog/posts.post_index', 'template:foo_bar'];

  forEach.call(examples, function (example) {
    equal(locator.normalize(locator.normalize(example)), locator.normalize(example));
  });
});
