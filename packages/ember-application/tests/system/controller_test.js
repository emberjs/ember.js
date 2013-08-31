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

test("Mixin sets up controllers if there is needs before calling super", function() {
  var container = new Ember.Container();

  container.register('controller:other', Ember.ArrayController.extend({
    needs: 'posts',
    content: Ember.computed.alias('controllers.posts')
  }));

  container.register('controller:another', Ember.ArrayController.extend({
    needs: 'posts',
    contentBinding: 'controllers.posts'
  }));

  container.register('controller:posts', Ember.ArrayController.extend());

  container.lookup('controller:posts').set('content', Ember.A(['a','b','c']));

  deepEqual(['a','b','c'], container.lookup('controller:other').toArray());

  deepEqual(['a','b','c'], container.lookup('controller:another').toArray());

});
