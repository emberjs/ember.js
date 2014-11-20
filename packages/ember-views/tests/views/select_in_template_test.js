import EmberObject from "ember-runtime/system/object";
import run from "ember-metal/run_loop";
import EmberView from "ember-views/views/view";
import EventDispatcher from "ember-views/system/event_dispatcher";

import { computed } from "ember-metal/computed";
import Namespace from "ember-runtime/system/namespace";
import ArrayController from "ember-runtime/controllers/array_controller";
import ArrayProxy from "ember-runtime/system/array_proxy";
import SelectView from "ember-views/views/select";
import EmberHandlebars from 'ember-handlebars-compiler';
import { default as htmlbarsCompile } from 'ember-htmlbars/system/compile';

var dispatcher, view;

var compile;
if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
  compile = htmlbarsCompile;
} else {
  compile = EmberHandlebars.compile;
}

QUnit.module("ember-htmlbars: Ember.Select - usage inside templates", {
  setup: function() {
    dispatcher = EventDispatcher.create();
    dispatcher.setup();
  },

  teardown: function() {
    run(function() {
      dispatcher.destroy();
      if (view) { view.destroy(); }
    });
  }
});

test("works from a template with bindings", function() {
  var Person = EmberObject.extend({
    id: null,
    firstName: null,
    lastName: null,

    fullName: computed(function() {
      return this.get('firstName') + " " + this.get('lastName');
    }).property('firstName', 'lastName')
  });

  var erik = Person.create({id: 4, firstName: 'Erik', lastName: 'Bryn'});

  var application = Namespace.create();

  application.peopleController = ArrayController.create({
    content: Ember.A([
      Person.create({id: 1, firstName: 'Yehuda', lastName: 'Katz'}),
      Person.create({id: 2, firstName: 'Tom', lastName: 'Dale'}),
      Person.create({id: 3, firstName: 'Peter', lastName: 'Wagenet'}),
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
      '    contentBinding="view.app.peopleController"' +
      '    optionLabelPath="content.fullName"' +
      '    optionValuePath="content.id"' +
      '    prompt="Pick a person:"' +
      '    selectionBinding="view.app.selectedPersonController.person"}}'
    )
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

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
    application.peopleController.pushObject(Person.create({id: 5, firstName: "James", lastName: "Rosen"}));
  });

  equal(select.$('option').length, 6, "New option was added");
  equal(select.get('selection'), erik, "Selection was maintained after new option was added");
});

test("upon content change, the DOM should reflect the selection (#481)", function() {
  var userOne = {name: 'Mike', options: Ember.A(['a', 'b']), selectedOption: 'a'};
  var userTwo = {name: 'John', options: Ember.A(['c', 'd']), selectedOption: 'd'};

  view = EmberView.create({
    user: userOne,
    selectView: SelectView,
    template: compile(
      '{{view view.selectView viewName="select"' +
      '    contentBinding="view.user.options"' +
      '    selectionBinding="view.user.selectedOption"}}'
    )
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

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

test("upon content change with Array-like content, the DOM should reflect the selection", function() {
  var tom = {id: 4, name: 'Tom'};
  var sylvain = {id: 5, name: 'Sylvain'};

  var proxy = ArrayProxy.create({
    content: Ember.A(),
    selectedOption: sylvain
  });

  view = EmberView.create({
    proxy: proxy,
    selectView: SelectView,
    template: compile(
      '{{view view.selectView viewName="select"' +
      '    contentBinding="view.proxy"' +
      '    selectionBinding="view.proxy.selectedOption"}}'
    )
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

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
    collection: Ember.A([{name: 'Wes', value: 'w'}, {name: 'Gordon', value: 'g'}]),
    val: 'g',
    selectView: SelectView,
    template: compile(templateString)
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

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

test("select element should correctly initialize and update selectedIndex and bound properties when using valueBinding (old xBinding='' syntax)", function() {
  testValueBinding(
    '{{view view.selectView viewName="select"' +
    '    contentBinding="view.collection"' +
    '    optionLabelPath="content.name"' +
    '    optionValuePath="content.value"' +
    '    prompt="Please wait..."' +
    '    valueBinding="view.val"}}'
  );
});

test("select element should correctly initialize and update selectedIndex and bound properties when using valueBinding (new quoteless binding shorthand)", function() {
  testValueBinding(
    '{{view view.selectView viewName="select"' +
    '    content=view.collection' +
    '    optionLabelPath="content.name"' +
    '    optionValuePath="content.value"' +
    '    prompt="Please wait..."' +
    '    value=view.val}}'
  );
});
