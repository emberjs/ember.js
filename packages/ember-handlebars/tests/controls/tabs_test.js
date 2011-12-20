var view, app;
var template =
  '{{#view Ember.TabContainerView currentView="foo"}}\n' +
  '  <ul>\n' +
  '    {{#view Ember.TabView id="tab1" value="foo"}}Foo{{/view}}\n' +
  '    {{#view Ember.TabView id="tab2" value="bar"}}Bar{{/view}}\n' +
  '  </ul>\n\n' +
  '  {{#view Ember.TabPaneView id="pane1" viewName="foo"}}\n\n' +
  '    foo\n' +
  '  {{/view}}\n' +
  '  {{#view Ember.TabPaneView id="pane2" viewName="bar"}}\n' +
  '    bar\n'+
  '  {{/view}}\n' +
  '{{/view}}';

module("Ember.TabContainerView and components", {
  setup: function() {
    app = Ember.Application.create({ rootElement: '#qunit-fixture' });

    view = Ember.View.create({
      template: Ember.Handlebars.compile(template)
    });

    Ember.run(function() {
      view.appendTo('#qunit-fixture');
    });
  },

  teardown: function() {
    app.destroy();
  }
});

test("tab container and its components are rendered", function() {
  equal(Ember.$.trim(Ember.$('#qunit-fixture #tab1').text()), "Foo", "first tab was rendered");
  equal(Ember.$.trim(Ember.$('#qunit-fixture #tab2').text()), "Bar", "second tab was rendered");

  equal(Ember.$.trim(Ember.$('#qunit-fixture #pane1').text()), "foo", "first pane was rendered");
  equal(Ember.$.trim(Ember.$('#qunit-fixture #pane2').text()), "bar", "second pane was rendered");
});

test("only the specified pane is visible", function() {
  Ember.$('#qunit-fixture').show();

  equal(Ember.$('#qunit-fixture #pane1:visible').length, 1, "pane 1 is visible");
  equal(Ember.$('#qunit-fixture #pane2:visible').length, 0, "pane 2 is not visible");

  Ember.$('#qunit-fixture').hide();
});

test("when a tab is clicked, its associated pane is shown", function() {
  Ember.$('#qunit-fixture').show();

  Ember.$('#tab2').trigger('mousedown');
  Ember.$('#tab2').trigger('mouseup');

  equal(Ember.$('#qunit-fixture #pane1:visible').length, 0, "pane 1 is visible");
  equal(Ember.$('#qunit-fixture #pane2:visible').length, 1, "pane 2 is not visible");

  Ember.$('#qunit-fixture').hide();
});

