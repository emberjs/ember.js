var App;

module("ember-testing", {
  teardown: function() {
    Ember.run(App, App.destroy);
    App = null;
  }
});

test("Ember.Application#injectTestHelpers/#removeTestHelpers", function() {
  App = Ember.run(Ember.Application, Ember.Application.create);
  ok(!window.visit);
  ok(!window.click);
  ok(!window.fillIn);
  var originalFind = window.find; // window.find already exists

  App.injectTestHelpers();

  ok(window.visit);
  ok(window.click);
  ok(window.fillIn);
  ok(window.find);

  App.removeTestHelpers();

  ok(!window.visit);
  ok(!window.click);
  ok(!window.fillIn);
  equal(window.find, originalFind); // window.find already exists
});

test("Ember.Application#setupForTesting", function() {
  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
  });

  equal(App.__container__.lookup('router:main').location.implementation, 'none');
  equal(window.EMBER_APP_BEING_TESTED, App);
});

test("visit transitions to the correct route", function() {
  expect(2);

  var visit, currentRoute;

  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
  });

  App.injectTestHelpers();
  visit = window.visit;

  App.Router.map(function() {
    this.route('posts');
    this.route('comments');
  });

  App.PostsRoute = Ember.Route.extend({
    renderTemplate: function() {
      currentRoute = 'posts';
    }
  });

  App.CommentsRoute = Ember.Route.extend({
    renderTemplate: function() {
      currentRoute = 'comments';
    }
  });

  Ember.run(App, App.advanceReadiness);

  currentRoute = 'index';

  visit('/posts').then(function() {
    equal(currentRoute, 'posts', "Successfully visited posts route");
    return visit('/comments');
  }).then(function() {
    equal(currentRoute, 'comments', "visit can be chained");
  });

  App.removeTestHelpers();
});
