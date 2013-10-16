var passedOptions;
var Container = requireModule('container');

var o_create = Object.create || (function(){
  function F(){}

  return function(o) {
    if (arguments.length !== 1) {
      throw new Ember.Error('Object.create implementation only accepts one parameter.');
    }
    F.prototype = o;
    return new F();
  };
}());

var guids = 0;

function factory() {
  var Klass = function(options) {
    setProperties(this, options);
    this._guid = guids++;
  };

  Klass.prototype.constructor = Klass;
  Klass.prototype.destroy = function() {
    this.isDestroyed = true;
  };

  Klass.prototype.toString = function() {
    return "<Factory:" + this._guid + ">";
  };

  Klass.create = create;
  Klass.extend = extend;
  Klass.reopen = extend;

  return Klass;

  function create(options) {
    passedOptions = options;
    return new this.prototype.constructor(options);
  }

  function reopenClass(options) {
    setProperties(this, options);
  }

  function extend (options) {
    var Child = function(options) {
      Klass.call(this, options);
    };

    var Parent = this;

    Child.prototype = new Parent();
    Child.prototype.constructor = Child;

    setProperties(Child.prototype, options);

    Child.create = create;
    Child.extend = extend;
    Child.reopen = extend;
    Child.reopenClass = reopenClass;

    return Child;
  }
}

function setProperties(object, properties) {
  for (var key in properties) {
    if (properties.hasOwnProperty(key)) {
      object[key] = properties[key];
    }
  }
}

var container;

module("Container (sub-containers)", {
  setup: function() {
    container = new Container();
    var PostController = factory();

    container.register('controller:post', PostController);
  },

  teardown: function() {
    if (!container.isDestroyed) {
      container.destroy();
    }
  }
});

test("Singletons already found on the parent container will be found again on the sub-container", function() {
  var postController = container.lookup('controller:post');
  var subContainer = container.child();

  equal(postController, subContainer.lookup('controller:post'));
});

test("Destroying a sub-container doesn't destroy any singletons on the parent", function() {
  var postController = container.lookup('controller:post');
  var subContainer = container.child();
  subContainer.destroy();

  equal(postController.isDestroyed, undefined, "The parent's singletons are not destroyed");
});

test("Looking up a singleton that wasn't yet looked up on a child container will cache it on the child", function() {
  var subContainer1 = container.child();
  var subContainer2 = container.child();

  var postController1 = subContainer1.lookup('controller:post');
  var postController2 = subContainer2.lookup('controller:post');

  notEqual(postController1, postController2);
});

test("Destroying a parent container destroys the sub-containers", function() {
  var subContainer1 = container.child();
  var subContainer2 = container.child();

  var postController1 = subContainer1.lookup('controller:post');
  var postController2 = subContainer2.lookup('controller:post');

  container.destroy();

  equal(postController1.isDestroyed, true, "The child's singleton is destroyed");
  equal(postController2.isDestroyed, true, "The child's singleton is destroyed");
});

test("Resolver is inherited from parent container", function() {
  var otherController = factory();
  container.resolver = function(fullName) {
    return otherController;
  };
  var subContainer = container.child();

  equal(subContainer.resolve('controller:post'), otherController, 'should use parent resolver');
  equal(container.resolve('controller:post'), otherController, 'should use resolver');
});

test("Type injections should be inherited", function() {
  var container = new Container();
  var PostController = factory();
  var Store = factory();

  container.register('controller:post', PostController);
  container.register('store:main', Store);

  container.typeInjection('controller', 'store', 'store:main');

  var store = container.lookup('store:main');

  var childContainer = container.child();
  var postController = childContainer.lookup('controller:post');

  equal(postController.store, store);
});
