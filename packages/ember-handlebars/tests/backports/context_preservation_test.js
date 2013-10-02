/*globals ContextPreservationTests:true*/

var originalFlag, originalWarn, warnings, viewToDestroy;

function appendView(childPreservesContext) {
  ContextPreservationTests.ChildView.reopenClass({ preservesContext: childPreservesContext });
  var view = ContextPreservationTests.ParentView.create();
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
  viewToDestroy = view;
  return view;
}

module("Backported Ember.View Context Preservation", {
  setup: function() {
    window.ContextPreservationTests = Ember.Namespace.create();
    originalFlag = Ember.VIEW_PRESERVES_CONTEXT;
    originalWarn = Ember.Logger.warn;
    warnings = [];
    Ember.Logger.warn = function(msg) {
      warnings.push(msg.replace("WARNING: ", ""));
    };

    ContextPreservationTests.parentContext = { key: 'parent view value' };

    ContextPreservationTests.ParentView = Ember.View.extend({
      template: Ember.Handlebars.compile("{{#with ContextPreservationTests.parentContext}}{{view ContextPreservationTests.ChildView}}{{/with}}")
    }).reopenClass({ preservesContext: true });

    ContextPreservationTests.ChildView = Ember.View.extend({
      template: Ember.Handlebars.compile('{{key}}'),
      key: 'child view value'
    });
  },

  teardown: function() {
    Ember.VIEW_PRESERVES_CONTEXT = originalFlag;
    Ember.Logger.warn = originalWarn;
    if (viewToDestroy) {
      Ember.run(function() {
        viewToDestroy.destroy();
      });
      viewToDestroy = undefined;
    }
    window.ContextPreservationTests = undefined;
  }
});

test("doesn't warn on false level", function() {
  Ember.VIEW_PRESERVES_CONTEXT = false;
  appendView(undefined);
  equal(warnings.length, 0);
});

test("uses the view as the context on false level by default", function() {
  Ember.VIEW_PRESERVES_CONTEXT = false;
  equal(appendView(undefined).$().text(), "child view value");
});

test("allows views to specify that they preserve context on false level", function() {
  Ember.VIEW_PRESERVES_CONTEXT = false;
  equal(appendView(true).$().text(), "parent view value");
});

test("warns on 'warn' level for views that don't preserve context", function() {
  Ember.VIEW_PRESERVES_CONTEXT = "warn";
  appendView(undefined);
  equal(warnings.length, 1);
});

test("doesn't warn on 'warn' level for views that do preserve context", function() {
  Ember.VIEW_PRESERVES_CONTEXT = "warn";
  appendView(true);
  equal(warnings.length, 0);
});

test("uses the view as the context on 'warn' level by default", function() {
  Ember.VIEW_PRESERVES_CONTEXT = 'warn';
  equal(appendView(undefined).$().text(), "child view value");
});

test("allows views to specify that they preserve context on 'warn' level", function() {
  Ember.VIEW_PRESERVES_CONTEXT = 'warn';
  equal(appendView(true).$().text(), "parent view value");
});

test("preserves context on true level", function() {
  Ember.VIEW_PRESERVES_CONTEXT = true;
  equal(appendView(undefined).$().text(), 'parent view value');
});

test("raises an exception if a view tries to override the default on true level", function() {
  Ember.VIEW_PRESERVES_CONTEXT = true;
  raises(function() {
    appendView(false);
  }, /Cannot override VIEW_PRESERVES_CONTEXT=true/);
});
