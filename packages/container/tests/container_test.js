var Container = requireModule('container');

module("Container");

function factory() {
  var Klass = function(container) {
    this.container = container;
  };

  Klass.prototype.destroy = function() {
    this.isDestroyed = true;
  };

  Klass.create = function(options) {
    return new Klass(options.container);
  };

  return Klass;
}

test("A registered factory returns the same instance each time", function() {
  var container = new Container();
  var PostController = factory();

  container.register('controller', 'post', PostController);

  var postController = container.lookup('controller:post');

  ok(postController instanceof PostController, "The lookup is an instance of the factory");

  equal(postController, container.lookup('controller:post'));
});

test("A container lookup has access to the container", function() {
  var container = new Container();
  var PostController = factory();

  container.register('controller', 'post', PostController);

  var postController = container.lookup('controller:post');

  equal(postController.container, container);
});

test("A factory type with a registered injection receives the injection", function() {
  var container = new Container();
  var PostController = factory();
  var Store = factory();

  container.register('controller', 'post', PostController);
  container.register('store', 'main', Store);

  container.typeInjection('controller', 'store', 'store:main');

  var postController = container.lookup('controller:post');
  var store = container.lookup('store:main');

  equal(postController.store, store);
});

test("An individual factory with a registered injection receives the injection", function() {
  var container = new Container();
  var PostController = factory();
  var Store = factory();

  container.register('controller', 'post', PostController);
  container.register('store', 'main', Store);

  container.injection('controller:post', 'store', 'store:main');

  var postController = container.lookup('controller:post');
  var store = container.lookup('store:main');

  equal(postController.store, store);
});

test("A factory with both type and individual injections", function() {
  var container = new Container();
  var PostController = factory();
  var Store = factory();
  var Router = factory();

  container.register('controller', 'post', PostController);
  container.register('store', 'main', Store);
  container.register('router', 'main', Router);

  container.injection('controller:post', 'store', 'store:main');
  container.typeInjection('controller', 'router', 'router:main');

  var postController = container.lookup('controller:post');
  var store = container.lookup('store:main');
  var router = container.lookup('router:main');

  equal(postController.store, store);
  equal(postController.router, router);
});

test("A non-singleton factory is never cached", function() {
  var container = new Container();
  var PostView = factory();

  container.register('view', 'post', PostView, { singleton: false });

  var postView1 = container.lookup('view:post');
  var postView2 = container.lookup('view:post');

  ok(postView1 !== postView2, "Non-singletons are not cached");
});

test("A non-instantiated property is not instantiated", function() {
  var container = new Container();

  var template = function() {};
  container.register('template', 'foo', template, { instantiate: false });
  equal(container.lookup('template:foo'), template);
});

test("A failed lookup returns undefined", function() {
  var container = new Container();

  equal(container.lookup("doesnot:exist"), undefined);
});

test("Destroying the container destroys any cached singletons", function() {
  var container = new Container();
  var PostController = factory();
  var PostView = factory();
  var template = function() {};

  container.register('controller', 'post', PostController);
  container.register('view', 'post', PostView, { singleton: false });
  container.register('template', 'post', template, { instantiate: false });

  container.injection('controller:post', 'postView', 'view:post');

  var postController = container.lookup('controller:post');
  var postView = postController.postView;

  ok(postView instanceof PostView, "The non-singleton was injected");

  container.destroy();

  ok(postController.isDestroyed, "Singletons are destroyed");
  ok(!postView.isDestroyed, "Non-singletons are not destroyed");
});

test("The container can take a hook to resolve factories lazily", function() {
  var container = new Container();
  var PostController = factory();

  container.resolve = function(fullName) {
    if (fullName === 'controller:post') {
      return PostController;
    }
  };

  var postController = container.lookup('controller:post');

  ok(postController instanceof PostController, "The correct factory was provided");
});

test("The container can get options that should be applied to all factories for a given type", function() {
  var container = new Container();
  var PostView = factory();

  container.resolve = function(fullName) {
    if (fullName === 'view:post') {
      return PostView;
    }
  };

  container.optionsForType('view', { singleton: false });

  var postView1 = container.lookup('view:post');
  var postView2 = container.lookup('view:post');

  ok(postView1 instanceof PostView, "The correct factory was provided");
  ok(postView2 instanceof PostView, "The correct factory was provided");

  ok(postView1 !== postView2, "The two lookups are different");
});
