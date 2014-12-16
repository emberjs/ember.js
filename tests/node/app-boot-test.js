/*globals __dirname*/

var path = require('path');
var distPath = path.join(__dirname, '../../dist');

QUnit.module("App boot");

QUnit.test("App is created without throwing an exception", function() {
  var Ember = require(path.join(distPath, 'ember.debug'));

  var App = Ember.Application.create({
  });

  App.Router = Ember.Router.extend({
    location: 'none'
  });

  App.advanceReadiness();

  QUnit.ok(App);
});
