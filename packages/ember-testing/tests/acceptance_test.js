var App, find, click, fillIn, currentRoute, visit, originalFailure;

module("ember-testing Acceptance", {
  setup: function(){
    Ember.$('<style>#ember-testing-container { position: absolute; background: white; bottom: 0; right: 0; width: 640px; height: 384px; overflow: auto; z-index: 9999; border: 1px solid #ccc; } #ember-testing { zoom: 50%; }</style>').appendTo('head');
    Ember.$('<div id="ember-testing-container"><div id="ember-testing"></div></div>').appendTo('body');
    Ember.run(function() {
      App = Ember.Application.create({
        rootElement: '#ember-testing'
      });

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

      App.setupForTesting();
    });

    Ember.run(function(){
      App.advanceReadiness();
    });

    App.injectTestHelpers();

    find = window.find;
    click = window.click;
    fillIn = window.fillIn;
    visit = window.visit;

    originalFailure = Ember.Test.failure;
  },

  teardown: function(){
    App.removeTestHelpers();
    Ember.$('#ember-testing-container, #ember-testing').remove();
    Ember.run(App, App.destroy);
    App = null;
    Ember.Test.failure = originalFailure;
  }
});

test("helpers can be chained", function() {
  expect(4);

  Ember.Test.failure = function(error) {
    equal(error, "exception", "Exception successfully caught and passed to Ember.test.failure");
  };

  currentRoute = 'index';

  visit('/posts').then(function() {
    equal(currentRoute, 'posts', "Successfully visited posts route");
    return click('a:contains("Comments")');
  }).then(function() {
    equal(currentRoute, 'comments', "visit chained with click");
    return fillIn('.ember-text-field', "yeah");
  }).then(function(){
    equal(Ember.$('.ember-text-field').val(), 'yeah', "chained with fillIn");
    throw "exception";
  }).then(function() {
    // This is needed in this test
    // so we can assert that thrown exceptions
    // do not fire multiple times
  });

});
