var map = Ember.ArrayUtils.map;

var application, select;

module("Ember.Select", {
  setup: function() {
    application = Ember.Application.create();
    select = Ember.Select.create();
  },

  teardown: function() {
    application.destroy();
    select.destroy();
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

  equal(select.$('option').length, 3, "Should have three options");
  equal(select.$().text(), "123", "Options should have content");
});

test("can specify the property path for an option's label and value", function() {
  select.set('content', Ember.A([
    { id: 1, firstName: 'Yehuda' },
    { id: 2, firstName: 'Tom' }
  ]));

  select.set('optionLabelPath', 'content.firstName');
  select.set('optionValuePath', 'content.id');

  append();

  equal(select.$('option').length, 2, "Should have two options");
  equal(select.$().text(), "YehudaTom", "Options should have content");
  deepEqual(map(select.$('option').toArray(), function(el) { return Ember.$(el).attr('value'); }), ["1", "2"], "Options should have values");
});

test("can retrieve the current selected option", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' },
      tom = { id: 2, firstName: 'Tom' };
  select.set('content', Ember.A([yehuda, tom]));

  append();

  equal(select.get('selection'), yehuda, "By default, the first option is selected");

  select.$()[0].selectedIndex = 1; // select Tom
  select.$().trigger('change');

  equal(select.get('selection'), tom, "On change, the new option should be selected");
});

test("selection can be set", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' },
      tom = { id: 2, firstName: 'Tom' };
  select.set('content', Ember.A([yehuda, tom]));

  select.set('selection', tom);

  append();

  equal(select.get('selection'), tom, "Initial selection should be correct");

  select.set('selection', yehuda);

  equal(select.$()[0].selectedIndex, 0, "After changing it, selection should be correct");
});

test("a prompt can be specified", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' },
      tom = { id: 2, firstName: 'Tom' };
  select.set('content', Ember.A([yehuda, tom]));
  select.set('prompt', 'Pick a person');
  select.set('optionLabelPath', 'content.firstName');
  select.set('optionValuePath', 'content.id');

  append();

  equal(select.$('option').length, 3, "There should be three options");
  equal(select.$()[0].selectedIndex, 0, "By default, the prompt is selected in the DOM");
  equal(select.$().val(), 'Pick a person', "By default, the prompt is selected in the DOM");

  equal(select.get('selection'), null, "When the prompt is selected, the selection should be null");

  select.set('selection', tom);
  equal(select.$()[0].selectedIndex, 2, "The selectedIndex accounts for the prompt");

  select.$()[0].selectedIndex = 0;
  select.$().trigger('change');

  equal(select.get('selection'), null, "When the prompt is selected again after another option, the selection should be null");

  select.$()[0].selectedIndex = 2;
  select.$().trigger('change');
  equal(select.get('selection'), tom, "Properly accounts for the prompt when DOM change occurs");
});

module("Ember.Select - usage inside templates", {
  setup: function() {
    application = Ember.Application.create();
  },

  teardown: function() {
    application.destroy();
  }
});

test("works from a template with bindings", function() {
  var Person = Ember.Object.extend({
    id: null,
    firstName: null,
    lastName: null,

    fullName: Ember.computed(function() {
      return this.get('firstName') + " " + this.get('lastName');
    }).property('firstName', 'lastName').cacheable()
  });

  var erik = Person.create({id: 4, firstName: 'Erik', lastName: 'Bryn'});
  application.peopleController = Ember.ArrayController.create({
    content: Ember.A([
      Person.create({id: 1, firstName: 'Yehuda', lastName: 'Katz'}),
      Person.create({id: 2, firstName: 'Tom', lastName: 'Dale'}),
      Person.create({id: 3, firstName: 'Peter', lastName: 'Wagenet'}),
      erik
    ])
  });

  application.selectedPersonController = Ember.Object.create({
    person: null
  });

  var view = Ember.View.create({
    app: application,
    template: Ember.Handlebars.compile(
      '{{view Ember.Select viewName="select"' +
      '                    contentBinding="app.peopleController"' +
      '                    optionLabelPath="content.fullName"' +
      '                    optionValuePath="content.id"' +
      '                    prompt="Pick a person:"' +
      '                    selectionBinding="app.selectedPersonController.person"}}'
    )
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  var select = view.get('select');
  ok(select.$().length, "Select was rendered");
  equal(select.$('option').length, 5, "Options were rendered");
  equal(select.$().text(), "Pick a person:Yehuda KatzTom DalePeter WagenetErik Bryn", "Option values were rendered");
  equal(select.get('selection'), null, "Nothing has been selected");

  application.selectedPersonController.set('person', erik);
  Ember.run.sync();
  equal(select.get('selection'), erik, "Selection was updated through binding");

  application.peopleController.pushObject(Person.create({id: 5, firstName: "James", lastName: "Rosen"}));
  Ember.run.end();
  equal(select.$('option').length, 6, "New option was added");
  equal(select.get('selection'), erik, "Selection was maintained after new option was added");
});
