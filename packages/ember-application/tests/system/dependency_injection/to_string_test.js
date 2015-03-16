import Ember from "ember-metal/core"; // lookup, etc
import run from "ember-metal/run_loop";
import Application from "ember-application/system/application";
import EmberObject from "ember-runtime/system/object";
import DefaultResolver from "ember-application/system/resolver";
import { guidFor } from "ember-metal/utils";

var originalLookup, App, originalModelInjections;

QUnit.module("Ember.Application Dependency Injection – toString", {
  setup() {
    originalModelInjections = Ember.MODEL_FACTORY_INJECTIONS;
    Ember.MODEL_FACTORY_INJECTIONS = true;

    originalLookup = Ember.lookup;

    run(function() {
      App = Application.create();
      Ember.lookup = {
        App: App
      };
    });

    App.Post = EmberObject.extend();

  },

  teardown() {
    Ember.lookup = originalLookup;
    run(App, 'destroy');
    Ember.MODEL_FACTORY_INJECTIONS = originalModelInjections;
  }
});

QUnit.test("factories", function() {
  var PostFactory = App.__container__.lookupFactory('model:post');
  equal(PostFactory.toString(), 'App.Post', 'expecting the model to be post');
});

QUnit.test("instances", function() {
  var post = App.__container__.lookup('model:post');
  var guid = guidFor(post);

  equal(post.toString(), '<App.Post:' + guid + '>', 'expecting the model to be post');
});

QUnit.test("with a custom resolver", function() {
  run(App, 'destroy');

  run(function() {
    App = Application.create({
      Resolver: DefaultResolver.extend({
        makeToString(factory, fullName) {
          return fullName;
        }
      })
    });
  });

  App.registry.register('model:peter', EmberObject.extend());

  var peter = App.__container__.lookup('model:peter');
  var guid = guidFor(peter);

  equal(peter.toString(), '<model:peter:' + guid + '>', 'expecting the supermodel to be peter');
});
