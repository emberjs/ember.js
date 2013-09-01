var locator, application, lookup, originalLookup;

module("Ember.Application Depedency Injection", {
  setup: function() {
    originalLookup = Ember.lookup;
    application = Ember.run(Ember.Application, 'create');

    locator = application.__container__;
  },

  teardown: function() {
    Ember.TEMPLATES = {};
    Ember.lookup = originalLookup;
    Ember.run(application, 'destroy');
  }
});

test('the default resolver can look things up in other namespaces', function() {
  var UserInterface = Ember.lookup.UserInterface = Ember.Namespace.create();
  UserInterface.NavigationController = Ember.Controller.extend();

  var nav = locator.lookup('controller:userInterface/navigation');

  ok(nav instanceof UserInterface.NavigationController, "the result should be an instance of the specified class");
});

test('the default resolver looks up templates in Ember.TEMPLATES', function() {
  function fooTemplate() {}
  function fooBarTemplate() {}
  function fooBarBazTemplate() {}

  Ember.TEMPLATES['foo'] = fooTemplate;
  Ember.TEMPLATES['fooBar'] = fooBarTemplate;
  Ember.TEMPLATES['fooBar/baz'] = fooBarBazTemplate;

  equal(locator.lookup('template:foo'), fooTemplate, "resolves template:foo");
  equal(locator.lookup('template:fooBar'), fooBarTemplate, "resolves template:foo_bar");
  equal(locator.lookup('template:fooBar.baz'), fooBarBazTemplate, "resolves template:foo_bar.baz");
});

test('the default resolver looks up basic name as no prefix', function() {
  ok(Ember.Controller.detect(locator.lookup('controller:basic')), 'locator looksup correct controller');
});

function detectEqual(first, second, message) {
  ok(first.detect(second), message);
}

test('the default resolver looks up arbitrary types on the namespace', function() {
  application.FooManager = Ember.Object.extend({});

  detectEqual(application.FooManager, locator.resolver('manager:foo'),"looks up FooManager on application");
});

test("the default resolver resolves models on the namespace", function() {
  application.Post = Ember.Object.extend({});

  detectEqual(application.Post, locator.lookupFactory('model:post'), "looks up Post model on application");
});

test("the default resolver throws an error if the fullName to resolve is invalid", function(){
  raises(function(){ locator.resolve(undefined);}, TypeError, /Invalid fullName/ );
  raises(function(){ locator.resolve(null);     }, TypeError, /Invalid fullName/ );
  raises(function(){ locator.resolve('');       }, TypeError, /Invalid fullName/ );
  raises(function(){ locator.resolve('');       }, TypeError, /Invalid fullName/ );
  raises(function(){ locator.resolve(':');      }, TypeError, /Invalid fullName/ );
  raises(function(){ locator.resolve('model');  }, TypeError, /Invalid fullName/ );
  raises(function(){ locator.resolve('model:'); }, TypeError, /Invalid fullName/ );
  raises(function(){ locator.resolve(':type');  }, TypeError, /Invalid fullName/ );
});
