/*globals ENV QUnit EmberDev */

(function() {
  window.Ember = {
    testing: true
  };
  window.ENV = window.ENV || {};

  // Test for "hooks in ENV.EMBER_LOAD_HOOKS['hookName'] get executed"
  ENV.EMBER_LOAD_HOOKS = ENV.EMBER_LOAD_HOOKS || {};
  ENV.EMBER_LOAD_HOOKS.__before_ember_test_hook__ = ENV.EMBER_LOAD_HOOKS.__before_ember_test_hook__ || [];
  ENV.__test_hook_count__ = 0;
  ENV.EMBER_LOAD_HOOKS.__before_ember_test_hook__.push(function(object) {
    ENV.__test_hook_count__ += object;
  });

  // Handle extending prototypes
  QUnit.config.urlConfig.push({ id: 'extendprototypes', label: 'Extend Prototypes'});
  var extendPrototypes  = QUnit.urlParams.extendprototypes;
  ENV['EXTEND_PROTOTYPES'] = !!extendPrototypes;

  // Don't worry about jQuery version
  ENV['FORCE_JQUERY'] = true;

  if (EmberDev.jsHint) {
    // jsHint makes its own Object.create stub, we don't want to use this
    ENV['STUB_OBJECT_CREATE'] = !Object.create;
  }

  // ensure that the views & templates are cleaned up after each test
  EmberDev.afterEach = function() {
    if (Ember && Ember.View) {
      var viewIds = [], id;
      for (id in Ember.View.views) {
        if (Ember.View.views[id] != null) {
          viewIds.push(id);
        }
      }

      if (viewIds.length > 0) {
        deepEqual(viewIds, [], "Ember.View.views should be empty");
        Ember.View.views = [];
      }
    }

    if (Ember && Ember.TEMPLATES) {
      var templateNames = [], name;
      for (name in Ember.TEMPLATES) {
        if (Ember.TEMPLATES[name] != null) {
          templateNames.push(name);
        }
      }

      if (templateNames.length > 0) {
        deepEqual(templateNames, [], "Ember.TEMPLATES should be empty");
        Ember.TEMPLATES = {};
      }
    }
  };

  EmberDev.distros = {
    spade:   'ember-spade.js',
    build:   'ember.js',
    prod:    'ember.prod.js',
    runtime: 'ember-runtime.js'
  };


})();
