module("Controller dependencies");

test("If a controller specifies a dependency, it is accessible", function() {
  var container = new Ember.Container();

  container.register('controller:post', Ember.Controller.extend({
    needs: 'posts'
  }));

  container.register('controller:posts', Ember.Controller.extend());

  var postController = container.lookup('controller:post'),
      postsController = container.lookup('controller:posts');

  equal(postsController, postController.get('controllers.posts'), "controller.posts must be auto synthesized");
});

test("If a controller specifies an unavailable dependency, it raises", function() {
  var container = new Ember.Container();

  container.register('controller:post', Ember.Controller.extend({
    needs: 'posts'
  }));

  expectAssertion(function() {
    container.lookup('controller:post');
  }, /controller:posts/);
});
