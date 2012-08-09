var map = Ember.EnumerableUtils.map;

var dispatcher, select;

module("Ember.Select", {
  setup: function() {
    dispatcher = Ember.EventDispatcher.create();
    dispatcher.setup();
    select = Ember.Select.create();
  },

  teardown: function() {
    Ember.run(function() {
      dispatcher.destroy();
      select.destroy();
    });
  }
});

function setAndFlush(view, key, value) {
  Ember.run(function() {
    Ember.set(view, key, value);
  });
}

function append() {
  Ember.run(function() {
    select.appendTo('#qunit-fixture');
  });
}

function selectedOptions() {
  var rv = [];
  for(var i=0, len = select.get('content.length'); i < len; ++i) {
    rv.push(select.get('childViews.' + i + '.childViews.0.selected'));
  }
  return rv;
}

test("has 'ember-view' and 'ember-select' CSS classes", function() {
  deepEqual(select.get('classNames'), ['ember-view', 'ember-select']);
});

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


test("select tabindex is updated when setting tabindex property of view", function() {
  select.set('tabindex', '4');
  append();

  equal(select.$().attr('tabindex'), "4", "renders select with the tabindex");

  select.set('tabindex', '1');

  equal(select.$().attr('tabindex'), "1", "updates select after tabindex changes");
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

test("can retrieve the current selected option when multiple=false", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' },
      tom = { id: 2, firstName: 'Tom' };
  select.set('content', Ember.A([yehuda, tom]));

  append();

  equal(select.get('selection'), yehuda, "By default, the first option is selected");

  select.$()[0].selectedIndex = 1; // select Tom
  select.$().trigger('change');

  equal(select.get('selection'), tom, "On change, the new option should be selected");
});

test("can retrieve the current selected options when multiple=true", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' },
      tom = { id: 2, firstName: 'Tom' },
      david = { id: 3, firstName: 'David' },
      brennain = { id: 4, firstName: 'Brennain' };
  select.set('content', Ember.A([yehuda, tom, david, brennain]));
  select.set('multiple', true);
  select.set('optionLabelPath', 'content.firstName');

  append();

  deepEqual(select.get('selection'), [], "By default, nothing is selected");

  select.$('option').each(function() {
    if (this.value === 'Tom' || this.value === 'David') {
      this.selected = true;
    }
  });

  select.$().trigger('change');

  deepEqual(select.get('selection'), [tom, david], "On change, the new options should be selected");
});

test("selection can be set when multiple=false", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' },
      tom = { id: 2, firstName: 'Tom' };
  select.set('content', Ember.A([yehuda, tom]));
  select.set('multiple', false);

  select.set('selection', tom);

  append();

  equal(select.get('selection'), tom, "Initial selection should be correct");

  select.set('selection', yehuda);

  equal(select.$()[0].selectedIndex, 0, "After changing it, selection should be correct");
});

test("selection can be set when multiple=true", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' },
      tom = { id: 2, firstName: 'Tom' },
      david = { id: 3, firstName: 'David' },
      brennain = { id: 4, firstName: 'Brennain' };
  select.set('content', Ember.A([yehuda, tom, david, brennain]));
  select.set('multiple', true);

  select.set('selection', tom);

  append();

  deepEqual(select.get('selection'), [tom], "Initial selection should be correct");

  select.set('selection', yehuda);

  deepEqual(select.get('selection'), [yehuda], "After changing it, selection should be correct");
});

test("multiple selections can be set when multiple=true", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' },
      tom = { id: 2, firstName: 'Tom' },
      david = { id: 3, firstName: 'David' },
      brennain = { id: 4, firstName: 'Brennain' };
  select.set('content', Ember.A([yehuda, tom, david, brennain]));
  select.set('optionLabelPath', 'content.firstName');
  select.set('multiple', true);

  select.set('selection', Ember.A([yehuda, david]));

  append();

  deepEqual(select.get('selection'), [yehuda, david], "Initial selection should be correct");

  select.set('selection', Ember.A([tom, brennain]));

  deepEqual(
    select.$(':selected').map(function(){ return Ember.$(this).text();}).toArray(),
    ['Tom', 'Brennain'],
    "After changing it, selection should be correct");
});

test("Ember.SelectedOption knows when it is selected when multiple=false", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' },
      tom = { id: 2, firstName: 'Tom' },
      david = { id: 3, firstName: 'David' },
      brennain = { id: 4, firstName: 'Brennain' };
  select.set('content', Ember.A([yehuda, tom, david, brennain]));
  select.set('multiple', false);

  select.set('selection', david);

  append();

  deepEqual(selectedOptions(), [false, false, true, false], "Initial selection should be correct");

  select.set('selection', brennain);

  deepEqual(selectedOptions(), [false, false, false, true], "After changing it, selection should be correct");
});

test("Ember.SelectedOption knows when it is selected when multiple=true", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' },
      tom = { id: 2, firstName: 'Tom' },
      david = { id: 3, firstName: 'David' },
      brennain = { id: 4, firstName: 'Brennain' };
  select.set('content', Ember.A([yehuda, tom, david, brennain]));
  select.set('multiple', true);

  select.set('selection', [yehuda, david]);

  append();

  deepEqual(selectedOptions(), [true, false, true, false], "Initial selection should be correct");

  select.set('selection', [tom, david]);

  deepEqual(selectedOptions(), [false, true, true, false], "After changing it, selection should be correct");
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
  equal(select.$('option:selected').text(), 'Pick a person', "By default, the prompt is selected in the DOM");
  equal(select.$().val(), '', "By default, the prompt has no value");

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

test("handles null content", function() {
  append();

  Ember.run(function() {
    select.set('content', null);
    select.set('selection', 'invalid');
  });

  equal(select.get('element').selectedIndex, -1, "should have no selection");

  Ember.run(function() {
    select.set('multiple', true);
    select.set('selection', [{ content: 'invalid' }]);
  });

  equal(select.get('element').selectedIndex, -1, "should have no selection");
});


test("should be able to select an option and then reselect the prompt", function() {
  select.set('content', Ember.A(['one', 'two', 'three']));
  select.set('prompt', 'Select something');

  append();

  select.$()[0].selectedIndex = 2;
  select.$().trigger('change');
  equal(select.get('selection'), 'two');

  select.$()[0].selectedIndex = 0;
  select.$().trigger('change');
  equal(select.get('selection'), null);
  equal(select.$()[0].selectedIndex, 0);
});

test("should be able to get the current selection's value", function() {
  select.set('content', Ember.A([
    {label: 'Yehuda Katz', value: 'wycats'},
    {label: 'Tom Dale', value: 'tomdale'},
    {label: 'Peter Wagenet', value: 'wagenet'},
    {label: 'Erik Bryn', value: 'ebryn'}
  ]));
  select.set('optionLabelPath', 'content.label');
  select.set('optionValuePath', 'content.value');

  append();

  equal(select.get('value'), 'wycats');
});

test("should be able to set the current selection by value", function() {
  var ebryn = {label: 'Erik Bryn', value: 'ebryn'};
  select.set('content', Ember.A([
    {label: 'Yehuda Katz', value: 'wycats'},
    {label: 'Tom Dale', value: 'tomdale'},
    {label: 'Peter Wagenet', value: 'wagenet'},
    ebryn
  ]));
  select.set('optionLabelPath', 'content.label');
  select.set('optionValuePath', 'content.value');
  select.set('value', 'ebryn');

  append();

  equal(select.get('value'), 'ebryn');
  equal(select.get('selection'), ebryn);
});

module("Ember.Select - usage inside templates", {
  setup: function() {
    dispatcher = Ember.EventDispatcher.create();
    dispatcher.setup();
  },

  teardown: function() {
    Ember.run(function() {
      dispatcher.destroy();
    });
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

  var application = Ember.Namespace.create();

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
  
  Ember.run(function(){
    application.selectedPersonController.set('person', erik);
  });
  
  equal(select.get('selection'), erik, "Selection was updated through binding");
  Ember.run(function(){
    application.peopleController.pushObject(Person.create({id: 5, firstName: "James", lastName: "Rosen"}));
  });
  
  equal(select.$('option').length, 6, "New option was added");
  equal(select.get('selection'), erik, "Selection was maintained after new option was added");
});

test("upon content change, the DOM should reflect the selection (#481)", function() {
  var userOne = {name: 'Mike', options: Ember.A(['a', 'b']), selectedOption: 'a'},
      userTwo = {name: 'John', options: Ember.A(['c', 'd']), selectedOption: 'd'};

  var view = Ember.View.create({
    user: userOne,
    template: Ember.Handlebars.compile(
      '{{view Ember.Select viewName="select"' +
      '    contentBinding="user.options"' +
      '    selectionBinding="user.selectedOption"}}'
    )
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  var select = view.get('select'),
      selectEl = select.$()[0];

  equal(select.get('selection'), 'a', "Precond: Initial selection is correct");
  equal(selectEl.selectedIndex, 0, "Precond: The DOM reflects the correct selection");

  Ember.run(function() {
    view.set('user', userTwo);
  });

  equal(select.get('selection'), 'd', "Selection was properly set after content change");
  equal(selectEl.selectedIndex, 1, "The DOM reflects the correct selection");
});

test("select element should initialize with the correct selectedIndex when using valueBinding", function() {
  var view = Ember.View.create({
    collection: Ember.A([{name: 'Wes', value: 'w'}, {name: 'Gordon', value: 'g'}]),
    val: 'g',
    template: Ember.Handlebars.compile(
      '{{view Ember.Select viewName="select"' +
      '    contentBinding="collection"' +
      '    optionLabelPath="content.name"' +
      '    optionValuePath="content.value"' +
      '    prompt="Please wait..."' +
      '    valueBinding="val"}}'
    )
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  var select = view.get('select'),
      selectEl = select.$()[0];

  equal(select.get('value'), 'g', "Precond: Initial selection is correct");
  equal(selectEl.selectedIndex, 2, "Precond: The DOM reflects the correct selection");
});
