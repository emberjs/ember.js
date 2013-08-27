var originalLookup, App;

module("Ember.Application Depedency Injection – toString",{
  setup: function() {
    originalLookup = Ember.lookup;

    Ember.run(function(){
      App = Ember.Application.create();
      Ember.lookup = {
        App: App
      };
    });

    App.Post = Ember.Object.extend();
  },

  teardown: function() {
    Ember.lookup = originalLookup;
    Ember.run(App, 'destroy');
  }
});

test("factories", function() {
  var PostFactory = App.__container__.lookupFactory('model:post');
  equal(PostFactory.toString(), 'App.Post', 'expecting the model to be post');
});

test("instances", function() {
  var post = App.__container__.lookup('model:post');
  var guid = Ember.guidFor(post);

  equal(post.toString(), '<App.Post:' + guid + '>', 'expecting the model to be post');
});

test("with a custom resolver", function() {
  Ember.run(App,'destroy');

  Ember.run(function(){
    App = Ember.Application.create({
      Resolver: Ember.DefaultResolver.extend({
        makeToString: function(factory, fullName) {
          return fullName;
        }
      })
    });
  });

  App.__container__.register('model:peter', Ember.Object.extend());

  var peter = App.__container__.lookup('model:peter');
  var guid = Ember.guidFor(peter);

  equal(peter.toString(), '<model:peter:' + guid + '>', 'expecting the model to be post');
});
