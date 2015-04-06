import EmberObject from "ember-runtime/system/object";
import run from "ember-metal/run_loop";
import EmberView from "ember-views/views/view";
import EventDispatcher from "ember-views/system/event_dispatcher";

import { computed } from "ember-metal/computed";
import Namespace from "ember-runtime/system/namespace";
import ArrayController from "ember-runtime/controllers/array_controller";
import ArrayProxy from "ember-runtime/system/array_proxy";
import SelectView from "ember-views/views/select";
import compile from 'ember-template-compiler/system/compile';
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

var dispatcher, view;

QUnit.module("ember-htmlbars: Ember.Select - usage inside templates", {
  setup() {
    dispatcher = EventDispatcher.create();
    dispatcher.setup();
  },

  teardown() {
    runDestroy(dispatcher);
    runDestroy(view);
  }
});

QUnit.skip("works from a template with bindings [DEPRECATED]", function() {
  var Person = EmberObject.extend({
    id: null,
    firstName: null,
    lastName: null,

    fullName: computed(function() {
      return this.get('firstName') + " " + this.get('lastName');
    }).property('firstName', 'lastName')
  });

  var erik = Person.create({ id: 4, firstName: 'Erik', lastName: 'Bryn' });

  var application = Namespace.create();

  application.peopleController = ArrayController.create({
    content: Ember.A([
      Person.create({ id: 1, firstName: 'Yehuda', lastName: 'Katz' }),
      Person.create({ id: 2, firstName: 'Tom', lastName: 'Dale' }),
      Person.create({ id: 3, firstName: 'Peter', lastName: 'Wagenet' }),
      erik
    ])
  });

  application.selectedPersonController = EmberObject.create({
    person: null
  });

  view = EmberView.create({
    app: application,
    selectView: SelectView,
    template: compile(
      '{{view view.selectView viewName="select"' +
      '    content=view.app.peopleController' +
      '    optionLabelPath="content.fullName"' +
      '    optionValuePath="content.id"' +
      '    prompt="Pick a person:"' +
      '    selection=view.app.selectedPersonController.person}}'
    )
  });

  expectDeprecation(function() {
    runAppend(view);
  }, /You're attempting to render a view by passing .+Binding to a view helper, but this syntax is deprecated/);

  var select = view.get('select');
  ok(select.$().length, "Select was rendered");
  equal(select.$('option').length, 5, "Options were rendered");
  equal(select.$().text(), "Pick a person:Yehuda KatzTom DalePeter WagenetErik Bryn\n", "Option values were rendered");
  equal(select.get('selection'), null, "Nothing has been selected");

  run(function() {
    application.selectedPersonController.set('person', erik);
  });

  equal(select.get('selection'), erik, "Selection was updated through binding");
  run(function() {
    application.peopleController.pushObject(Person.create({ id: 5, firstName: "James", lastName: "Rosen" }));
  });

  equal(select.$('option').length, 6, "New option was added");
  equal(select.get('selection'), erik, "Selection was maintained after new option was added");
});

QUnit.skip("works from a template", function() {
  var Person = EmberObject.extend({
    id: null,
    firstName: null,
    lastName: null,

    fullName: computed(function() {
      return this.get('firstName') + " " + this.get('lastName');
    }).property('firstName', 'lastName')
  });

  var erik = Person.create({ id: 4, firstName: 'Erik', lastName: 'Bryn' });

  var application = Namespace.create();

  application.peopleController = ArrayController.create({
    content: Ember.A([
      Person.create({ id: 1, firstName: 'Yehuda', lastName: 'Katz' }),
      Person.create({ id: 2, firstName: 'Tom', lastName: 'Dale' }),
      Person.create({ id: 3, firstName: 'Peter', lastName: 'Wagenet' }),
      erik
    ])
  });

  application.selectedPersonController = EmberObject.create({
    person: null
  });

  view = EmberView.create({
    app: application,
    selectView: SelectView,
    template: compile(
      '{{view view.selectView viewName="select"' +
      '    content=view.app.peopleController' +
      '    optionLabelPath="content.fullName"' +
      '    optionValuePath="content.id"' +
      '    prompt="Pick a person:"' +
      '    selection=view.app.selectedPersonController.person}}'
    )
  });

  runAppend(view);

  var select = view.get('select');
  ok(select.$().length, "Select was rendered");
  equal(select.$('option').length, 5, "Options were rendered");
  equal(select.$().text(), "Pick a person:Yehuda KatzTom DalePeter WagenetErik Bryn\n", "Option values were rendered");
  equal(select.get('selection'), null, "Nothing has been selected");

  run(function() {
    application.selectedPersonController.set('person', erik);
  });

  equal(select.get('selection'), erik, "Selection was updated through binding");
  run(function() {
    application.peopleController.pushObject(Person.create({ id: 5, firstName: "James", lastName: "Rosen" }));
  });

  equal(select.$('option').length, 6, "New option was added");
  equal(select.get('selection'), erik, "Selection was maintained after new option was added");
});

QUnit.skip("upon content change, the DOM should reflect the selection (#481)", function() {
  var userOne = { name: 'Mike', options: Ember.A(['a', 'b']), selectedOption: 'a' };
  var userTwo = { name: 'John', options: Ember.A(['c', 'd']), selectedOption: 'd' };

  view = EmberView.create({
    user: userOne,
    selectView: SelectView,
    template: compile(
      '{{view view.selectView viewName="select"' +
      '    content=view.user.options' +
      '    selection=view.user.selectedOption}}'
    )
  });

  runAppend(view);

  var select = view.get('select');
  var selectEl = select.$()[0];

  equal(select.get('selection'), 'a', "Precond: Initial selection is correct");
  equal(selectEl.selectedIndex, 0, "Precond: The DOM reflects the correct selection");

  run(function() {
    view.set('user', userTwo);
  });

  equal(select.get('selection'), 'd', "Selection was properly set after content change");
  equal(selectEl.selectedIndex, 1, "The DOM reflects the correct selection");
});

QUnit.skip("upon content change with Array-like content, the DOM should reflect the selection", function() {
  var tom = { id: 4, name: 'Tom' };
  var sylvain = { id: 5, name: 'Sylvain' };

  var proxy = ArrayProxy.create({
    content: Ember.A(),
    selectedOption: sylvain
  });

  view = EmberView.create({
    proxy: proxy,
    selectView: SelectView,
    template: compile(
      '{{view view.selectView viewName="select"' +
      '    content=view.proxy' +
      '    selection=view.proxy.selectedOption}}'
    )
  });

  runAppend(view);

  var select = view.get('select');
  var selectEl = select.$()[0];

  equal(selectEl.selectedIndex, -1, "Precond: The DOM reflects the lack of selection");

  run(function() {
    proxy.set('content', Ember.A([tom, sylvain]));
  });

  equal(select.get('selection'), sylvain, "Selection was properly set after content change");
  equal(selectEl.selectedIndex, 1, "The DOM reflects the correct selection");
});

function testValueBinding(templateString) {
  view = EmberView.create({
    collection: Ember.A([{ name: 'Wes', value: 'w' }, { name: 'Gordon', value: 'g' }]),
    val: 'g',
    selectView: SelectView,
    template: compile(templateString)
  });

  runAppend(view);

  var select = view.get('select');
  var selectEl = select.$()[0];

  equal(view.get('val'), 'g', "Precond: Initial bound property is correct");
  equal(select.get('value'), 'g', "Precond: Initial selection is correct");
  equal(selectEl.selectedIndex, 2, "Precond: The DOM reflects the correct selection");

  select.$('option:eq(2)').removeAttr('selected');
  select.$('option:eq(1)').prop('selected', true);
  select.$().trigger('change');

  equal(view.get('val'), 'w', "Updated bound property is correct");
  equal(select.get('value'), 'w', "Updated selection is correct");
  equal(selectEl.selectedIndex, 1, "The DOM is updated to reflect the new selection");
}

QUnit.skip("select element should correctly initialize and update selectedIndex and bound properties when using valueBinding [DEPRECATED]", function() {
  expectDeprecation(`You're using legacy binding syntax: valueBinding="view.val" @ 1:176 in (inline). Please replace with value=view.val`);

  testValueBinding(
    '{{view view.selectView viewName="select"' +
    '    contentBinding="view.collection"' +
    '    optionLabelPath="content.name"' +
    '    optionValuePath="content.value"' +
    '    prompt="Please wait..."' +
    '    valueBinding="view.val"}}'
  );
});

QUnit.skip("select element should correctly initialize and update selectedIndex and bound properties when using valueBinding", function() {
  testValueBinding(
    '{{view view.selectView viewName="select"' +
    '    content=view.collection' +
    '    optionLabelPath="content.name"' +
    '    optionValuePath="content.value"' +
    '    prompt="Please wait..."' +
    '    value=view.val}}'
  );
});

function testSelectionBinding(templateString) {
  view = EmberView.create({
    collection: Ember.A([{ name: 'Wes', value: 'w' }, { name: 'Gordon', value: 'g' }]),
    selection: { name: 'Gordon', value: 'g' },
    selectView: SelectView,
    template: compile(templateString)
  });

  runAppend(view);

  var select = view.get('select');
  var selectEl = select.$()[0];

  equal(view.get('selection.value'), 'g', "Precond: Initial bound property is correct");
  equal(select.get('selection.value'), 'g', "Precond: Initial selection is correct");
  equal(selectEl.selectedIndex, 2, "Precond: The DOM reflects the correct selection");
  equal(select.$('option:eq(2)').prop('selected'), true, "Precond: selected property is set to proper option");

  select.$('option:eq(2)').removeAttr('selected');
  select.$('option:eq(1)').prop('selected', true);
  select.$().trigger('change');

  equal(view.get('selection.value'), 'w', "Updated bound property is correct");
  equal(select.get('selection.value'), 'w', "Updated selection is correct");
  equal(selectEl.selectedIndex, 1, "The DOM is updated to reflect the new selection");
  equal(select.$('option:eq(1)').prop('selected'), true, "Selected property is set to proper option");
}

QUnit.skip("select element should correctly initialize and update selectedIndex and bound properties when using selectionBinding [DEPRECATED]", function() {
  expectDeprecation(`You're using legacy binding syntax: contentBinding="view.collection" @ 1:44 in (inline). Please replace with content=view.collection`);

  testSelectionBinding(
    '{{view view.selectView viewName="select"' +
    '    contentBinding="view.collection"' +
    '    optionLabelPath="content.name"' +
    '    optionValuePath="content.value"' +
    '    prompt="Please wait..."' +
    '    selectionBinding="view.selection"}}'
  );
});

QUnit.skip("select element should correctly initialize and update selectedIndex and bound properties when using a bound selection", function() {
  testSelectionBinding(
    '{{view view.selectView viewName="select"' +
    '    content=view.collection' +
    '    optionLabelPath="content.name"' +
    '    optionValuePath="content.value"' +
    '    prompt="Please wait..."' +
    '    selection=view.selection}}'
  );
});

QUnit.skip("select element should correctly initialize and update selectedIndex and bound properties when using selectionBinding and optionValuePath with custom path", function() {
  var templateString = '{{view view.selectView viewName="select"' +
    '    content=view.collection' +
    '    optionLabelPath="content.name"' +
    '    optionValuePath="content.val"' +
    '    prompt="Please wait..."' +
    '    selection=view.selection}}';

  view = EmberView.create({
    collection: Ember.A([{ name: 'Wes', val: 'w' }, { name: 'Gordon', val: 'g' }]),
    selection: { name: 'Gordon', val: 'g' },
    selectView: SelectView,
    template: Ember.Handlebars.compile(templateString)
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  var select = view.get('select');
  var selectEl = select.$()[0];

  equal(view.get('selection.val'), 'g', "Precond: Initial bound property is correct");
  equal(select.get('selection.val'), 'g', "Precond: Initial selection is correct");
  equal(selectEl.selectedIndex, 2, "Precond: The DOM reflects the correct selection");
  equal(select.$('option:eq(1)').prop('selected'), false, "Precond: selected property is set to proper option");

  select.$('option:eq(2)').removeAttr('selected');
  select.$('option:eq(1)').prop('selected', true);
  select.$().trigger('change');

  equal(view.get('selection.val'), 'w', "Updated bound property is correct");
  equal(select.get('selection.val'), 'w', "Updated selection is correct");
  equal(selectEl.selectedIndex, 1, "The DOM is updated to reflect the new selection");
  equal(select.$('option:eq(1)').prop('selected'), true, "selected property is set to proper option");
});
