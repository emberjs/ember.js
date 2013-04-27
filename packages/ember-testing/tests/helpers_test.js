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
  ok(!window.wait);
  var originalFind = window.find; // window.find already exists

  App.injectTestHelpers();

  ok(window.visit);
  ok(window.click);
  ok(window.fillIn);
  ok(window.find);
  ok(window.wait);

  App.removeTestHelpers();

  ok(!window.visit);
  ok(!window.click);
  ok(!window.fillIn);
  equal(window.find, originalFind); // window.find already exists
  ok(!window.wait);
});

test("Ember.Application#setupForTesting", function() {
  Ember.run(function() {
    App = Ember.Application.create();
    App.setupForTesting();
  });

  equal(App.__container__.lookup('router:main').location.implementation, 'none');
  equal(window.EMBER_APP_BEING_TESTED, App);
});

test("helpers can be chained", function() {
  expect(3);

  var currentRoute;

  Ember.run(function(){
    Ember.$('<style>#ember-testing-container { position: absolute; background: white; bottom: 0; right: 0; width: 640px; height: 384px; overflow: auto; z-index: 9999; border: 1px solid #ccc; } #ember-testing { zoom: 50%; }</style>').appendTo('head');
    Ember.$('<div id="ember-testing-container"><div id="ember-testing"></div></div>').appendTo('body');
  });

  Ember.run(function() {
    App = Ember.Application.create({
      rootElement: '#ember-testing'
    });
    App.setupForTesting();
  });

  App.injectTestHelpers();
  App.Router.map(function() {
    this.route('posts');
    this.route('comments');
  });

  App.PostsRoute = Ember.Route.extend({
    renderTemplate: function() {
      currentRoute = 'posts';
      this._super();
    }
  });

  App.PostsView = Ember.View.extend({
    defaultTemplate: Ember.Handlebars.compile("{{#linkTo 'comments'}}Comments{{/linkTo}}")
  });

  App.CommentsRoute = Ember.Route.extend({
    renderTemplate: function() {
      currentRoute = 'comments';
      this._super();
    }
  });

  App.CommentsView = Ember.View.extend({
    defaultTemplate: Ember.Handlebars.compile("{{input type=text}}")
  });

  Ember.run(App, App.advanceReadiness);

  currentRoute = 'index';

  window.wait().then(function() {
    return window.visit('/posts');
  }).then(function() {
    equal(currentRoute, 'posts', "Successfully visited posts route");
    return window.click('a:contains("Comments")');
  }).then(function() {
    equal(currentRoute, 'comments', "visit chained with click");
    return window.fillIn('.ember-text-field', "yeah");
  }).then(function(){
    equal(Ember.$('.ember-text-field').val(), 'yeah', "chained with fillIn");
    App.removeTestHelpers();
    Ember.$('#ember-testing-container').remove();
  });
});
