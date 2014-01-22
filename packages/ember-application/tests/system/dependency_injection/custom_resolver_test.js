var application;

module("Ember.Application Depedency Injection – customResolver",{
  setup: function() {
    function fallbackTemplate() { return "<h1>Fallback</h1>"; }

    var Resolver = Ember.DefaultResolver.extend({
      resolveTemplate: function(resolvable) {
        var resolvedTemplate = this._super(resolvable);
        if (resolvedTemplate) { return resolvedTemplate; }
        return fallbackTemplate;
      }
    });

    application = Ember.run(function() {
      return Ember.Application.create({
        Resolver: Resolver,
        rootElement: '#qunit-fixture'

      });
    });
  },
  teardown: function() {
    Ember.run(application, 'destroy');
  }
});

test("a resolver can be supplied to application", function() {
  equal(Ember.$("h1", application.rootElement).text(), "Fallback");
});

