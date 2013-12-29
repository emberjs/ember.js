
var controller, container;

if (Ember.FEATURES.isEnabled("query-params-new")) {

  module("Ember.Controller query param support", {
    setup: function() {

      container = new Ember.Container();

      container.register('controller:thing', Ember.Controller.extend({
        _queryParamScope: 'thing',
        queryParams: ['foo', 'bar:baz'],
        foo: 'imafoo',
        bar: 'imabar'
      }));

      controller = container.lookup('controller:thing');
    },

    teardown: function() {
    }
  });

  test("setting a query param property on an inactive controller does nothing", function() {
    expect(0);

    controller.target = {
      transitionTo: function(params) {
        ok(false, "should not get here");
      }
    };

    Ember.run(controller, 'set', 'foo', 'newfoo');
  });

  test("setting a query param property fires off a transition", function() {
    expect(1);

    controller.target = {
      transitionTo: function(params) {
        deepEqual(params, { queryParams: { 'thing[foo]': 'newfoo' } }, "transitionTo is called");
      }
    };

    Ember.run(controller, '_activateQueryParamObservers');
    Ember.run(controller, 'set', 'foo', 'newfoo');
  });

  test("setting multiple query param properties fires off a single transition", function() {
    expect(1);

    controller.target = {
      transitionTo: function(params) {
        deepEqual(params, { queryParams: { 'thing[foo]': 'newfoo', 'baz': 'newbar' } }, "single transitionTo is called");
      }
    };

    Ember.run(controller, '_activateQueryParamObservers');

    Ember.run(function() {
      controller.set('foo', 'newfoo');
      controller.set('bar', 'newbar');
    });
  });

  test("changing a prop on a deactivated controller does nothing", function() {
    expect(1);

    controller.target = {
      transitionTo: function(params) {
        deepEqual(params, { queryParams: { 'thing[foo]': 'newfoo' } }, "transitionTo is called");
      }
    };

    Ember.run(controller, '_activateQueryParamObservers');
    Ember.run(controller, 'set', 'foo', 'newfoo');
    Ember.run(controller, '_deactivateQueryParamObservers');
    Ember.run(controller, 'set', 'foo', 'nonono');
  });
}
