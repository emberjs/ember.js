module("Controller dependencies");

test("If a controller specifies a dependency, it is available to `controllerFor`", function() {
  var container = new Ember.Container();

  container.register('controller', 'post', Ember.Controller.extend({
    needs: 'posts',

    postsController: Ember.computed(function() {
      return this.controllerFor('posts');
    })
  }));

  container.register('controller', 'posts', Ember.Controller.extend());

  var postController = container.lookup('controller:post'),
      postsController = container.lookup('controller:posts');

  equal(postsController, postController.get('postsController'), "Getting dependency controllers work");
});

test("If a controller doesn't specify a dependency it is not available to `controllerFor", function(){
  var container = new Ember.Container();
  
  container.register('controller', 'post', Ember.Controller.extend({

    postsController: Ember.computed(function() {
      return this.controllerFor('posts');
    })
  }));

  container.register('controller', 'posts', Ember.Controller.extend());

  var postController = container.lookup('controller:post');
  
  equal(null, postController.get('postsController'), "Controller dependencies need to be specified in the `needs` property.")
});

test("If a controller specifies an unavailable dependency, it raises", function() {
  var container = new Ember.Container();

  container.register('controller', 'post', Ember.Controller.extend({
    needs: 'posts'
  }));

  raises(function() {
    container.lookup('controller:post');
  }, /controller:posts/);
});

