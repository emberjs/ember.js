module("Controller dependencies");

test("If a controller specifies a dependency, but does not have a container it should error", function(){
  var Controller = Ember.Controller.extend({
    needs: 'posts'
  });

  expectAssertion(function(){
    Controller.create();
  }, /specifies `needs`, but does not have a container. Please ensure this controller was instantiated with a container./);
});

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

test("raises if trying to get a controller that was not pre-defined in `needs`", function() {
  var container = new Ember.Container();

  container.register('controller:foo', Ember.Controller.extend());
  container.register('controller:bar', Ember.Controller.extend({
    needs: 'foo'
  }));

  var fooController = container.lookup('controller:foo');
  var barController = container.lookup('controller:bar');

  throws(function(){
    fooController.get('controllers.bar');
  }, /#needs does not include `bar`/,
  'throws if controllers is accesed but needs not defined');

  equal(barController.get('controllers.foo'), fooController, 'correctly needed controllers should continue to work');

  throws(function(){
    barController.get('controllers.baz');
  }, /#needs does not include `baz`/,
  'should throw if no such controller was needed');
});

test("setting the controllers property directly, should not be possible", function(){
  var controller = Ember.Controller.create();
  var controllers = controller.get('controllers');

  throws(function(){
    controller.set('controllers', 'epic-self-troll');
  }, /Cannot Set: controllers on:/,
  'should raise when attempting to set to the controllers property');

  equal(controller.get('controllers'), controllers, 'original controllers CP should have been unchanged');
});

test ("setting the value of a controller dependency should not be possible", function(){
  var container = new Ember.Container();

  container.register('controller:post', Ember.Controller.extend({
    needs: 'posts'
  }));

  container.register('controller:posts', Ember.Controller.extend());

  var postController = container.lookup('controller:post'),
      postsController = container.lookup('controller:posts');

  throws(function(){
    postController.set('controllers.posts', 'epic-self-troll');
  },
  /You cannot overwrite the value of `controllers.posts` of .+/,
  'should raise when attempting to set the value of a controller dependency property');

  postController.set('controllers.posts.title', "A Troll's Life");
  equal(postController.get('controllers.posts.title'), "A Troll's Life", "can set the value of controllers.posts.title");
});

test("raises if a dependency with a period is requested", function() {
  var container = new Ember.Container();

  container.register('controller:big.bird', Ember.Controller.extend());
  container.register('controller:foo', Ember.Controller.extend({
    needs: 'big.bird'
  }));

  expectAssertion(function() {
    container.lookup('controller:foo');
  }, /needs must not specify dependencies with periods in their names \(big\.bird\)/,
  'throws if periods used');
});

