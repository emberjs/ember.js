var appendView = function(view) {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
};

var view;

module("Handlebars {{#if}} and {{#unless}} helpers", {
  teardown: function() {
    if (view) {
      view.destroy();
    }
  }
});

if (Ember.VIEW_PRESERVES_CONTEXT) {

  test("unless should keep the current context (#784)", function() {
    view = Ember.View.create({
      o: Ember.Object.create({foo: '42'}),

      template: Ember.Handlebars.compile('{{#with o}}{{#view Ember.View}}{{#unless view.doesNotExist}}foo: {{foo}}{{/unless}}{{/view}}{{/with}}')
    });

    appendView(view);

    equal(view.$().text(), 'foo: 42');
  });

}
