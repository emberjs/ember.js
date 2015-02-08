import jQuery from "ember-views/system/jquery";
import run from "ember-metal/run_loop";
import Application from "ember-application/system/application";
import DefaultResolver from "ember-application/system/resolver";

var application;

QUnit.module("Ember.Application Dependency Injection – customResolver", {
  setup: function() {
    function fallbackTemplate() { return "<h1>Fallback</h1>"; }

    var Resolver = DefaultResolver.extend({
      resolveTemplate: function(resolvable) {
        var resolvedTemplate = this._super(resolvable);
        if (resolvedTemplate) { return resolvedTemplate; }
        return fallbackTemplate;
      }
    });

    application = run(function() {
      return Application.create({
        Resolver: Resolver,
        rootElement: '#qunit-fixture'

      });
    });
  },
  teardown: function() {
    run(application, 'destroy');
  }
});

QUnit.test("a resolver can be supplied to application", function() {
  equal(jQuery("h1", application.rootElement).text(), "Fallback");
});

