import "ember";

var App;

module('AutoLocation', {
  setup: function() {
    Ember.AutoLocation._location = {
      href: 'http://test.com/',
      pathname: '/rootdir/subdir',
      hash: '',
      search: '',
      replace: function () {
        ok(false, 'location.replace should not be called');
      }
    };

    Ember.run(function() {
      App = Ember.Application.create({
        name: 'App',
        rootElement: '#qunit-fixture'
      });
      App.Router.reopen({
        location: 'none',
        rootURL: '/rootdir/'
      });
      App.deferReadiness();
    });
  },

  teardown: function() {
    Ember.run(function() {
      App.destroy();
      App = null;

      Ember.TEMPLATES = {};
    });
  }
});

test('has the rootURL from the main router', function() {
  Ember.run(App, 'advanceReadiness');

  var location = App.__container__.lookup('location:auto');
  equal(Ember.get(location, 'rootURL'), '/rootdir/');
});
