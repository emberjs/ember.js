var application, select;

module("Ember.Select", {
  setup: function() {
    application = Ember.Application.create();
    select = Ember.Select.create();
  },

  teardown: function() {
    select.destroy();
    application.destroy();
  }
});

function append() {
  Ember.run(function() {
    select.appendTo('#qunit-fixture');
  });
}

test("should render", function() {
  append();

  ok(select.$().length, "Select renders");
});

test("can have options", function() {
  select.set('content', Ember.A([1, 2, 3]));

  append();

  equals(select.$('option').length, 3, "Should have three options");
  equals(select.$().text(), "123", "Options should have content");
});

test("can specify the property path for an option's label and value", function() {
  select.set('content', Ember.A([
    { id: 1, firstName: 'Yehuda' },
    { id: 2, firstName: 'Tom' }
  ]));

  select.set('optionLabelPath', 'content.firstName');
  select.set('optionValuePath', 'content.id');

  append();

  equals(select.$('option').length, 2, "Should have two options");
  equals(select.$().text(), "YehudaTom", "Options should have content");
  deepEqual(select.$('option').toArray().map(function(el) { return $(el).attr('value'); }), ["1", "2"], "Options should have values");
});

test("can retrieve the current selected option", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' },
      tom = { id: 2, firstName: 'Tom' };
  select.set('content', Ember.A([yehuda, tom]));

  append();

  equals(select.get('selection'), yehuda, "By default, the first option is selected");

  select.$()[0].selectedIndex = 1; // select Tom
  select.$().trigger('change');

  equals(select.get('selection'), tom, "On change, the new option should be selected");
});

test("selection can be set", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' },
      tom = { id: 2, firstName: 'Tom' };
  select.set('content', Ember.A([yehuda, tom]));

  select.set('selection', tom);

  append();

  equals(select.get('selection'), tom, "Initial selection should be correct");

  select.set('selection', yehuda);

  equals(select.$()[0].selectedIndex, 0, "After changing it, selection should be correct");
});
