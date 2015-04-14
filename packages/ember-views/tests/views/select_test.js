import EmberSelect from "ember-views/views/select";
import EmberObject from "ember-runtime/system/object";
import run from "ember-metal/run_loop";
import jQuery from "ember-views/system/jquery";
import { map } from "ember-metal/enumerable_utils";
import EventDispatcher from "ember-views/system/event_dispatcher";
import SafeString from 'htmlbars-util/safe-string';

var trim = jQuery.trim;

var dispatcher, select;

QUnit.module("Ember.Select", {
  setup: function() {
    dispatcher = EventDispatcher.create();
    dispatcher.setup();
    select = EmberSelect.create();
  },

  teardown: function() {
    run(function() {
      dispatcher.destroy();
      select.destroy();
    });
  }
});

function append() {
  run(function() {
    select.appendTo('#qunit-fixture');
  });
}

function selectedOptions() {
  return select.get('childViews').mapBy('selected');
}

test("has 'ember-view' and 'ember-select' CSS classes", function() {
  deepEqual(select.get('classNames'), ['ember-view', 'ember-select']);
});

test("should render", function() {
  append();

  ok(select.$().length, "Select renders");
});

test("should begin disabled if the disabled attribute is true", function() {
  select.set('disabled', true);
  append();

  ok(select.$().is(":disabled"));
});

// Browsers before IE10 do not support the required property.
if (document && ('required' in document.createElement('input'))) {
  test("should begin required if the required attribute is true", function() {
    select.set('required', true);
    append();

    ok(select.element.required, 'required property is truthy');
  });

  test("should become required if the required attribute is changed", function() {
    append();
    ok(!select.element.required, 'required property is falsy');

    run(function() { select.set('required', true); });
    ok(select.element.required, 'required property is truthy');

    run(function() { select.set('required', false); });
    ok(!select.element.required, 'required property is falsy');
  });
}

test("should become disabled if the disabled attribute is changed", function() {
  append();
  ok(!select.element.disabled, 'disabled property is falsy');

  run(function() { select.set('disabled', true); });
  ok(select.element.disabled, 'disabled property is truthy');

  run(function() { select.set('disabled', false); });
  ok(!select.element.disabled, 'disabled property is falsy');
});

test("can have options", function() {
  select.set('content', Ember.A([1, 2, 3]));

  append();

  equal(select.$('option').length, 3, "Should have three options");
  // IE 8 adds whitespace
  equal(trim(select.$().text()), "123", "Options should have content");
});


test("select tabindex is updated when setting tabindex property of view", function() {
  run(function() { select.set('tabindex', '4'); });
  append();

  equal(select.$().attr('tabindex'), "4", "renders select with the tabindex");

  run(function() { select.set('tabindex', '1'); });

  equal(select.$().attr('tabindex'), "1", "updates select after tabindex changes");
});

test("select name is updated when setting name property of view", function() {
  run(function() { select.set('name', 'foo'); });
  append();

  equal(select.$().attr('name'), "foo", "renders select with the name");

  run(function() { select.set('name', 'bar'); });

  equal(select.$().attr('name'), "bar", "updates select after name changes");
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
  // IE 8 adds whitespace
  equal(trim(select.$().text()), "YehudaTom", "Options should have content");
  deepEqual(map(select.$('option').toArray(), function(el) { return jQuery(el).attr('value'); }), ["1", "2"], "Options should have values");
});

QUnit.test("XSS: does not escape label value when it is a SafeString", function() {
  select.set('content', Ember.A([
    { id: 1, firstName: new SafeString('<p>Yehuda</p>') },
    { id: 2, firstName: new SafeString('<p>Tom</p>') }
  ]));

  select.set('optionLabelPath', 'content.firstName');
  select.set('optionValuePath', 'content.id');

  append();

  equal(select.$('option').length, 2, "Should have two options");
  equal(select.$('option[value=1] p').length, 1, "Should have child elements");

  // IE 8 adds whitespace
  equal(trim(select.$().text()), "YehudaTom", "Options should have content");
  deepEqual(map(select.$('option').toArray(), function(el) { return jQuery(el).attr('value'); }), ["1", "2"], "Options should have values");
});

QUnit.test("XSS: escapes label value content", function() {
  select.set('content', Ember.A([
    { id: 1, firstName: '<p>Yehuda</p>' },
    { id: 2, firstName: '<p>Tom</p>' }
  ]));

  select.set('optionLabelPath', 'content.firstName');
  select.set('optionValuePath', 'content.id');

  append();

  equal(select.$('option').length, 2, "Should have two options");
  equal(select.$('option[value=1] b').length, 0, "Should have no child elements");

  // IE 8 adds whitespace
  equal(trim(select.$().text()), "<p>Yehuda</p><p>Tom</p>", "Options should have content");
  deepEqual(map(select.$('option').toArray(), function(el) { return jQuery(el).attr('value'); }), ["1", "2"], "Options should have values");
});

test("can retrieve the current selected option when multiple=false", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' };
  var tom = { id: 2, firstName: 'Tom' };

  select.set('content', Ember.A([yehuda, tom]));

  append();

  equal(select.get('selection'), yehuda, "By default, the first option is selected");

  select.$()[0].selectedIndex = 1; // select Tom
  select.$().trigger('change');

  equal(select.get('selection'), tom, "On change, the new option should be selected");
});

test("can retrieve the current selected options when multiple=true", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' };
  var tom = { id: 2, firstName: 'Tom' };
  var david = { id: 3, firstName: 'David' };
  var brennain = { id: 4, firstName: 'Brennain' };

  select.set('content', Ember.A([yehuda, tom, david, brennain]));
  select.set('multiple', true);
  select.set('optionLabelPath', 'content.firstName');
  select.set('optionValuePath', 'content.firstName');

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
  var yehuda = { id: 1, firstName: 'Yehuda' };
  var tom = { id: 2, firstName: 'Tom' };

  run(function() {
    select.set('content', Ember.A([yehuda, tom]));
    select.set('multiple', false);
    select.set('selection', tom);
  });

  append();

  equal(select.get('selection'), tom, "Initial selection should be correct");

  run(function() { select.set('selection', yehuda); });

  equal(select.$()[0].selectedIndex, 0, "After changing it, selection should be correct");
});

test("selection can be set from a Promise when multiple=false", function() {
  expect(1);

  var yehuda = { id: 1, firstName: 'Yehuda' };
  var tom = { id: 2, firstName: 'Tom' };

  run(function() {
    select.set('content', Ember.A([yehuda, tom]));
    select.set('multiple', false);
    select.set('selection', Ember.RSVP.Promise.resolve(tom));
  });

  append();

  equal(select.$()[0].selectedIndex, 1, "Should select from Promise content");
});

test("selection from a Promise don't overwrite newer selection once resolved, when multiple=false", function() {
  expect(1);

  var yehuda = { id: 1, firstName: 'Yehuda' };
  var tom = { id: 2, firstName: 'Tom' };
  var seb = { id: 3, firstName: 'Seb' };

  QUnit.stop();

  run(function() {
    select.set('content', Ember.A([yehuda, tom, seb]));
    select.set('multiple', false);
    select.set('selection', new Ember.RSVP.Promise(function(resolve, reject) {
      Ember.run.later(function() {
        run(function(){
          resolve(tom);
        });
        QUnit.start();
        equal(select.$()[0].selectedIndex, 2, "Should not select from Promise if newer selection");
      }, 40);
    }));
    select.set('selection', new Ember.RSVP.Promise(function(resolve, reject) {
      Ember.run.later(function() {
        run(function() {
          resolve(seb);
        });
      }, 30);
    }));
  });

  append();
});

test("selection from a Promise resolving to null should not select when multiple=false", function() {
  expect(1);

  var yehuda = { id: 1, firstName: 'Yehuda' };
  var tom = { id: 2, firstName: 'Tom' };

  run(function() {
    select.set('content', Ember.A([yehuda, tom]));
    select.set('multiple', false);
    select.set('selection', Ember.RSVP.Promise.resolve(null));
  });

  append();

  equal(select.$()[0].selectedIndex, -1, "Should not select any object when the Promise resolve to null");
});

test("selection can be set when multiple=true", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' };
  var tom = { id: 2, firstName: 'Tom' };
  var david = { id: 3, firstName: 'David' };
  var brennain = { id: 4, firstName: 'Brennain' };

  run(function() {
    select.set('content', Ember.A([yehuda, tom, david, brennain]));
    select.set('multiple', true);
    select.set('selection', tom);
  });

  append();

  deepEqual(select.get('selection'), [tom], "Initial selection should be correct");

  run(function() { select.set('selection', yehuda); });

  deepEqual(select.get('selection'), [yehuda], "After changing it, selection should be correct");
});

test("selection can be set when multiple=true and prompt", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' };
  var tom = { id: 2, firstName: 'Tom' };
  var david = { id: 3, firstName: 'David' };
  var brennain = { id: 4, firstName: 'Brennain' };

  run(function() {
    select.set('content', Ember.A([yehuda, tom, david, brennain]));
    select.set('multiple', true);
    select.set('prompt', 'Pick one!');
    select.set('selection', tom);
  });

  append();

  deepEqual(select.get('selection'), [tom], "Initial selection should be correct");

  run(function() {
    select.set('selection', yehuda);
  });

  deepEqual(select.get('selection'), [yehuda], "After changing it, selection should be correct");
});

test("multiple selections can be set when multiple=true", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' };
  var tom = { id: 2, firstName: 'Tom' };
  var david = { id: 3, firstName: 'David' };
  var brennain = { id: 4, firstName: 'Brennain' };

  run(function() {
    select.set('content', Ember.A([yehuda, tom, david, brennain]));
    select.set('optionLabelPath', 'content.firstName');
    select.set('multiple', true);

    select.set('selection', Ember.A([yehuda, david]));
  });

  append();

  deepEqual(select.get('selection'), [yehuda, david], "Initial selection should be correct");

  run(function() { select.set('selection', Ember.A([tom, brennain])); });

  deepEqual(
    select.$(':selected').map(function() { return trim(jQuery(this).text());}).toArray(),
    ['Tom', 'Brennain'],
    "After changing it, selection should be correct");
});

test("multiple selections can be set by changing in place the selection array when multiple=true", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' };
  var tom = { id: 2, firstName: 'Tom' };
  var david = { id: 3, firstName: 'David' };
  var brennain = { id: 4, firstName: 'Brennain' };
  var selection = Ember.A([yehuda, tom]);

  run(function() {
    select.set('content', Ember.A([yehuda, tom, david, brennain]));
    select.set('optionLabelPath', 'content.firstName');
    select.set('multiple', true);
    select.set('selection', selection);
  });

  append();

  deepEqual(select.get('selection'), [yehuda, tom], "Initial selection should be correct");

  run(function() {
    selection.replace(0, selection.get('length'), Ember.A([david, brennain]));
  });

  deepEqual(
    select.$(':selected').map(function() { return trim(jQuery(this).text());}).toArray(),
    ['David', 'Brennain'],
    "After updating the selection array in-place, selection should be correct");
});


test("multiple selections can be set indirectly via bindings and in-place when multiple=true (issue #1058)", function() {
  var indirectContent = EmberObject.create();

  var tom = { id: 2, firstName: 'Tom' };
  var david = { id: 3, firstName: 'David' };
  var brennain = { id: 4, firstName: 'Brennain' };
  var cyril = { id: 5, firstName: 'Cyril' };

  run(function() {
    select.destroy(); // Destroy the existing select

    run(function() {
      select = EmberSelect.extend({
        indirectContent: indirectContent,
        contentBinding: 'indirectContent.controller.content',
        selectionBinding: 'indirectContent.controller.selection',
        multiple: true,
        optionLabelPath: 'content.firstName'
      }).create();

      indirectContent.set('controller', EmberObject.create({
        content: Ember.A([tom, david, brennain]),
        selection: Ember.A([david])
      }));
    });

    append();
  });

  deepEqual(select.get('content'), [tom, david, brennain], "Initial content should be correct");
  deepEqual(select.get('selection'), [david], "Initial selection should be correct");

  run(function() {
    indirectContent.set('controller.content', Ember.A([david, cyril]));
    indirectContent.set('controller.selection', Ember.A([cyril]));
  });

  deepEqual(select.get('content'), [david, cyril], "After updating bound content, content should be correct");
  deepEqual(select.get('selection'), [cyril], "After updating bound selection, selection should be correct");
});

test("select with group can group options", function() {
  var content = Ember.A([
    { firstName: 'Yehuda', organization: 'Tilde' },
    { firstName: 'Tom', organization: 'Tilde' },
    { firstName: 'Keith', organization: 'Envato' }
  ]);

  run(function() {
    select.set('content', content);
    select.set('optionGroupPath', 'organization');
    select.set('optionLabelPath', 'content.firstName');
  });

  append();

  equal(select.$('optgroup').length, 2);

  var labels = [];
  select.$('optgroup').each(function() {
    labels.push(this.label);
  });
  equal(labels.join(''), ['TildeEnvato']);

  equal(trim(select.$('optgroup').first().text()), 'YehudaTom');
  equal(trim(select.$('optgroup').last().text()), 'Keith');
});

test("select with group doesn't break options", function() {
  var content = Ember.A([
    { id: 1, firstName: 'Yehuda', organization: 'Tilde' },
    { id: 2, firstName: 'Tom', organization: 'Tilde' },
    { id: 3, firstName: 'Keith', organization: 'Envato' }
  ]);

  run(function() {
    select.set('content', content);
    select.set('optionGroupPath', 'organization');
    select.set('optionLabelPath', 'content.firstName');
    select.set('optionValuePath', 'content.id');
  });

  append();

  equal(select.$('option').length, 3);
  equal(trim(select.$().text()), 'YehudaTomKeith');

  run(function() {
    content.set('firstObject.firstName', 'Peter');
  });
  equal(select.$().text(), 'PeterTomKeith\n');

  select.$('option').get(0).selected = true;
  select.$().trigger('change');
  deepEqual(select.get('selection'), content.get('firstObject'));
});

test("select with group observes its content", function() {
  var wycats = { firstName: 'Yehuda', organization: 'Tilde' };
  var content = Ember.A([
    wycats
  ]);

  run(function() {
    select.set('content', content);
    select.set('optionGroupPath', 'organization');
    select.set('optionLabelPath', 'content.firstName');
  });

  append();

  run(function() {
    content.pushObject({ firstName: 'Keith', organization: 'Envato' });
  });

  equal(select.$('optgroup').length, 2);
  equal(select.$('optgroup[label=Envato]').length, 1);

  run(function() {
    select.set('optionGroupPath', 'firstName');
  });
  var labels = [];
  select.$('optgroup').each(function() {
    labels.push(this.label);
  });
  equal(labels.join(''), 'YehudaKeith');
});

test("select with group whose content is undefined doesn't breaks", function() {

  var content;
  run(function() {
    select.set('content', content);
    select.set('optionGroupPath', 'organization');
    select.set('optionLabelPath', 'content.firstName');
  });

  append();

  equal(select.$('optgroup').length, 0);
});

test("selection uses the same array when multiple=true", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' };
  var tom = { id: 2, firstName: 'Tom' };
  var david = { id: 3, firstName: 'David' };
  var brennain = { id: 4, firstName: 'Brennain' };
  var selection = Ember.A([yehuda, david]);

  run(function() {
    select.set('content', Ember.A([yehuda, tom, david, brennain]));
    select.set('multiple', true);
    select.set('optionLabelPath', 'content.firstName');
    select.set('selection', selection);
  });

  append();

  deepEqual(select.get('selection'), [yehuda, david], "Initial selection should be correct");

  select.$('option').each(function() { this.selected = false; });
  select.$(':contains("Tom"), :contains("David")').each(function() { this.selected = true; });

  select.$().trigger('change');

  deepEqual(select.get('selection'), [tom,david], "On change the selection is updated");
  deepEqual(selection, [tom,david], "On change the original selection array is updated");
});

test("Ember.SelectedOption knows when it is selected when multiple=false", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' };
  var tom = { id: 2, firstName: 'Tom' };
  var david = { id: 3, firstName: 'David' };
  var brennain = { id: 4, firstName: 'Brennain' };

  run(function() {
    select.set('content', Ember.A([yehuda, tom, david, brennain]));
    select.set('multiple', false);

    select.set('selection', david);
  });

  append();

  deepEqual(selectedOptions(), [false, false, true, false], "Initial selection should be correct");

  run(function() { select.set('selection', brennain); });

  deepEqual(selectedOptions(), [false, false, false, true], "After changing it, selection should be correct");
});

test("Ember.SelectedOption knows when it is selected when multiple=true", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' };
  var tom = { id: 2, firstName: 'Tom' };
  var david = { id: 3, firstName: 'David' };
  var brennain = { id: 4, firstName: 'Brennain' };

  run(function() {
    select.set('content', Ember.A([yehuda, tom, david, brennain]));
    select.set('multiple', true);

    select.set('selection', [yehuda, david]);
  });

  append();

  deepEqual(selectedOptions(), [true, false, true, false], "Initial selection should be correct");

  run(function() {
    select.set('selection', [tom, david]);
  });

  deepEqual(selectedOptions(), [false, true, true, false], "After changing it, selection should be correct");
});

test("Ember.SelectedOption knows when it is selected when multiple=true and options are primitives", function() {
  run(function() {
    select.set('content', Ember.A([1, 2, 3, 4]));
    select.set('multiple', true);
    select.set('selection', [1, 3]);
  });

  append();

  deepEqual(selectedOptions(), [true, false, true, false], "Initial selection should be correct");

  run(function() { select.set('selection', [2, 3]); });

  deepEqual(selectedOptions(), [false, true, true, false], "After changing it, selection should be correct");
});

test("a prompt can be specified", function() {
  var yehuda = { id: 1, firstName: 'Yehuda' };
  var tom = { id: 2, firstName: 'Tom' };

  run(function() {
    select.set('content', Ember.A([yehuda, tom]));
    select.set('prompt', 'Pick a person');
    select.set('optionLabelPath', 'content.firstName');
    select.set('optionValuePath', 'content.id');
  });

  append();

  equal(select.$('option').length, 3, "There should be three options");
  equal(select.$()[0].selectedIndex, 0, "By default, the prompt is selected in the DOM");
  equal(trim(select.$('option:selected').text()), 'Pick a person', "By default, the prompt is selected in the DOM");
  equal(select.$().val(), '', "By default, the prompt has no value");

  equal(select.get('selection'), null, "When the prompt is selected, the selection should be null");

  run(function() { select.set('selection', tom); });

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

  run(function() {
    select.set('content', null);
    select.set('selection', 'invalid');
    select.set('value', 'also_invalid');
  });

  equal(select.get('element').selectedIndex, -1, "should have no selection");

  run(function() {
    select.set('multiple', true);
    select.set('selection', [{ content: 'invalid' }]);
  });

  equal(select.get('element').selectedIndex, -1, "should have no selection");
});

test("valueBinding handles 0 as initiated value (issue #2763)", function() {
  var indirectData = EmberObject.create({
    value: 0
  });

  run(function() {
    select.destroy(); // Destroy the existing select

    select = EmberSelect.extend({
      content: Ember.A([1,0]),
      indirectData: indirectData,
      valueBinding: 'indirectData.value'
    }).create();

    // append();
    run(function() {
      select.appendTo('#qunit-fixture');
    });
  });

  equal(select.get('value'), 0, "Value property should equal 0");
});

test("should be able to select an option and then reselect the prompt", function() {
  run(function() {
    select.set('content', Ember.A(['one', 'two', 'three']));
    select.set('prompt', 'Select something');
  });

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
  run(function() {
    select.set('content', Ember.A([
      {label: 'Yehuda Katz', value: 'wycats'},
      {label: 'Tom Dale', value: 'tomdale'},
      {label: 'Peter Wagenet', value: 'wagenet'},
      {label: 'Erik Bryn', value: 'ebryn'}
    ]));
    select.set('optionLabelPath', 'content.label');
    select.set('optionValuePath', 'content.value');
  });

  append();

  equal(select.get('value'), 'wycats');
});

test("should be able to set the current selection by value", function() {
  var ebryn = {label: 'Erik Bryn', value: 'ebryn'};

  run(function() {
    select.set('content', Ember.A([
      {label: 'Yehuda Katz', value: 'wycats'},
      {label: 'Tom Dale', value: 'tomdale'},
      {label: 'Peter Wagenet', value: 'wagenet'},
      ebryn
    ]));
    select.set('optionLabelPath', 'content.label');
    select.set('optionValuePath', 'content.value');
    select.set('value', 'ebryn');
  });

  append();

  equal(select.get('value'), 'ebryn');
  equal(select.get('selection'), ebryn);
});
