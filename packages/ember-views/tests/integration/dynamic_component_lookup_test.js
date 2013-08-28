var App, find, visit, originalAdapter;

module("ember-views/integration", {
  setup: function() {
    Ember.$('<div id="ember-testing-container"><div id="ember-testing">' +
            '  <script type="text/x-handlebars" data-template-name="application">' +
            '    {{#each}} {{my-dynamic type=this}} {{/each}}' +
            '  </script>' +

            '  <script type="text/x-handlebars" data-template-name="components/my-a">' +
            '    <div class="sub-component">{{type}}</div>' +
            '  </script>' +

            '  <script type="text/x-handlebars" data-template-name="components/my-b">' +
            '    <div class="sub-component">{{type}}</div>' +
            '  </script>' +

            '  <script type="text/x-handlebars" data-template-name="components/my-c">' +
            '    <div class="sub-component">{{type}}</div>' +
            '  </script>' +
            '</div></div>').appendTo('body');
    Ember.run(function() {
      App = Ember.Application.create({
        rootElement: '#ember-testing'
      });

      App.ApplicationRoute = Ember.Route.extend({
        model: function() {
          return Ember.A(['a', 'b', 'c']);
        }
      });

      App.MyDynamicView = Ember.ContainerView.extend({
        init: function() {
          this._super();

          var type = this.get('type'), viewClass;
          var viewClass = this.container.lookupFactory('component:my-' + type);

          var view = this.createChildView(viewClass, {
            type: type
          });

          this.pushObject(view);
        }
      });

      Ember.Handlebars.helper('my-dynamic', App.MyDynamicView);

      App.setupForTesting();
    });

    Ember.run(function() {
      App.reset();
      App.deferReadiness();
    });

    App.injectTestHelpers();

    find = window.find;
    visit = window.visit;

    originalAdapter = Ember.Test.adapter;
  },

  teardown: function() {
    App.removeTestHelpers();
    Ember.$('#ember-testing-container, #ember-testing').remove();
    Ember.run(App, App.destroy);
    App = null;
    Ember.Test.adapter = originalAdapter;
  }
});

test("dynamic components are created", function() {
  Ember.run(App, 'advanceReadiness');
  visit("/").then(function() {
    var components = find(".sub-component").length;

    equal(components, 3, "successfully rendered dynamic components");
  });
});
