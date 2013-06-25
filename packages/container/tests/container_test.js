var passedOptions;
var Container = requireModule('container');

var setProperties = function(object, properties) {
  for (var key in properties) {
    if (properties.hasOwnProperty(key)) {
      object[key] = properties[key];
    }
  }
};

module("Container");

var guids = 0;

function factory() {
  var Klass = function(options) {
    setProperties(this, options);
    this._guid = guids++;
  };

  Klass.prototype.destroy = function() {
    this.isDestroyed = true;
  };

  Klass.prototype.toString = function() {
    return "<Factory:" + this._guid + ">";
  };

  Klass.create = function(options) {
    passedOptions = options;
    return new Klass(options);
  };

  return Klass;
}

test("A registered factory returns the same instance each time", function() {
  var container = new Container();
  var PostController = factory();

  container.register('controller:post', PostController);

  var postController = container.lookup('controller:post');

  ok(postController instanceof PostController, "The lookup is an instance of the factory");

  equal(postController, container.lookup('controller:post'));
});

test("A registered factory is returned from lookupFactory", function() {
  var container = new Container();
  var PostController = factory();

  container.register('controller:post', PostController);

  equal(container.lookupFactory('controller:post'), PostController, "The factory is returned from lookupFactory");
});

test("A registered factory returns a fresh instance if singleton: false is passed as an option", function() {
  var container = new Container();
  var PostController = factory();

  container.register('controller:post', PostController);

  var postController1 = container.lookup('controller:post');
  var postController2 = container.lookup('controller:post', { singleton: false });
  var postController3 = container.lookup('controller:post', { singleton: false });
  var postController4 = container.lookup('controller:post');

  equal(postController1.toString(), postController4.toString(), "Singleton factories looked up normally return the same value");
  notEqual(postController1.toString(), postController2.toString(), "Singleton factories are not equal to factories looked up with singleton: false");
  notEqual(postController2.toString(), postController3.toString(), "Two factories looked up with singleton: false are not equal");
  notEqual(postController3.toString(), postController4.toString(), "A singleton factory looked up after a factory called with singleton: false is not equal");

  ok(postController1 instanceof PostController, "All instances are instances of the registered factory");
  ok(postController2 instanceof PostController, "All instances are instances of the registered factory");
  ok(postController3 instanceof PostController, "All instances are instances of the registered factory");
  ok(postController4 instanceof PostController, "All instances are instances of the registered factory");
});

test("A registered factory returns true for `has` if an item is registered", function() {
  var container = new Container();
  var PostController = factory();

  container.register('controller:post', PostController);

  equal(container.has('controller:post'), true, "The `has` method returned true for registered factories");
  equal(container.has('controller:posts'), false, "The `has` method returned false for unregistered factories");
});

test("A container lookup has access to the container", function() {
  var container = new Container();
  var PostController = factory();

  container.register('controller:post', PostController);

  var postController = container.lookup('controller:post');

  equal(postController.container, container);
});

test("A factory type with a registered injection receives the injection", function() {
  var container = new Container();
  var PostController = factory();
  var Store = factory();

  container.register('controller:post', PostController);
  container.register('store:main', Store);

  container.typeInjection('controller', 'store', 'store:main');

  var postController = container.lookup('controller:post');
  var store = container.lookup('store:main');

  equal(postController.store, store);
});

test("An individual factory with a registered injection receives the injection", function() {
  var container = new Container();
  var PostController = factory();
  var Store = factory();

  container.register('controller:post', PostController);
  container.register('store:main', Store);

  container.injection('controller:post', 'store', 'store:main');

  var postController = container.lookup('controller:post');
  var store = container.lookup('store:main');

  deepEqual(passedOptions, {
    store: store,
    container: container,
    _debugContainerKey: 'controller:post'
  });
});

test("A factory type with registered array injections receives an array of injections", function() {
  var container = new Container();
  var PostController = factory();
  var PluginA = factory();
  var PluginB = factory();
  var PluginC = factory();

  container.register('controller:post', PostController);
  container.register('plugin:a', PluginA);
  container.register('plugin:b', PluginB);
  container.register('plugin:c', PluginC);

  container.typeInjection('controller', 'plugins', 'plugin:a', {array:true});
  container.typeInjection('controller', 'plugins', 'plugin:b', {array:true});
  container.typeInjection('controller', 'plugins', 'plugin:c', {array:true});

  var postController = container.lookup('controller:post');
  var pluginA = container.lookup('plugin:a');
  var pluginB = container.lookup('plugin:b');
  var pluginC = container.lookup('plugin:c');

  ok(postController.plugins instanceof Array);
  equal(postController.plugins.length, 3);
  ok(postController.plugins.indexOf(pluginA) >= 0);
  ok(postController.plugins.indexOf(pluginB) >= 0);
  ok(postController.plugins.indexOf(pluginC) >= 0);
});

test("An individual factory with registered array injections receives an array of injections", function() {
  var container = new Container();
  var PostController = factory();
  var PluginA = factory();
  var PluginB = factory();
  var PluginC = factory();

  container.register('controller:post', PostController);
  container.register('plugin:a', PluginA);
  container.register('plugin:b', PluginB);
  container.register('plugin:c', PluginC);

  container.injection('controller:post', 'plugins', 'plugin:a', {array:true});
  container.injection('controller:post', 'plugins', 'plugin:b', {array:true});
  container.injection('controller:post', 'plugins', 'plugin:c', {array:true});

  var postController = container.lookup('controller:post');
  var pluginA = container.lookup('plugin:a');
  var pluginB = container.lookup('plugin:b');
  var pluginC = container.lookup('plugin:c');

  ok(postController.plugins instanceof Array);
  equal(postController.plugins.length, 3);
  ok(postController.plugins.indexOf(pluginA) >= 0);
  ok(postController.plugins.indexOf(pluginB) >= 0);
  ok(postController.plugins.indexOf(pluginC) >= 0);
});

test("A factory with both type and individual injections", function() {
  var container = new Container();
  var PostController = factory();
  var Store = factory();
  var Router = factory();

  container.register('controller:post', PostController);
  container.register('store:main', Store);
  container.register('router:main', Router);

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

  container.register('view:post', PostView, { singleton: false });

  var postView1 = container.lookup('view:post');
  var postView2 = container.lookup('view:post');

  ok(postView1 !== postView2, "Non-singletons are not cached");
});

test("A non-instantiated property is not instantiated", function() {
  var container = new Container();

  var template = function() {};
  container.register('template:foo', template, { instantiate: false });
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

  container.register('controller:post', PostController);
  container.register('view:post', PostView, { singleton: false });
  container.register('template:post', template, { instantiate: false });

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

test("The container respect the resolver hook for `has`", function() {
  var container = new Container();
  var PostController = factory();

  container.resolve = function(fullName) {
    if (fullName === 'controller:post') {
      return PostController;
    }
  };

  ok(container.has('controller:post'), "the `has` method uses the resolver hook");
});

test("The container normalizes names before resolving", function() {
  var container = new Container();
  var PostController = factory();

  container.normalize = function(fullName) {
    return 'controller:post';
  };

  container.register('controller:post', PostController);
  var postController = container.lookup('wycats');

  ok(postController instanceof PostController, "Normalizes the name before resolving");
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
