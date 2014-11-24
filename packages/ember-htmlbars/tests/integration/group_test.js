/*jshint newcap:false*/

import run from "ember-metal/run_loop";
import jQuery from "ember-views/system/jquery";
import EmberView from "ember-views/views/view";
import _MetamorphView from "ember-views/views/metamorph_view";
import EmberHandlebars from "ember-handlebars-compiler";
import ArrayProxy from "ember-runtime/system/array_proxy";
import { A } from "ember-runtime/system/native_array";
import Container from "ember-runtime/system/container";
import { set } from "ember-metal/property_set";
import Component from "ember-views/views/component";
import htmlbarsCompile from "ember-htmlbars/system/compile";

var compile;
if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
  compile = htmlbarsCompile;
} else {
  compile = EmberHandlebars.compile;
}

var trim = jQuery.trim;
var container, view;

function appendView() {
  run(function() { view.appendTo('#qunit-fixture'); });
}

QUnit.module("ember-htmlbars: group flag", {
  setup: function() {
    container = new Container();
    container.register('view:default', _MetamorphView);
    container.register('view:toplevel', EmberView.extend());
  },

  teardown: function() {
    run(function() {
      if (view) {
        view.destroy();
      }
      if (container) {
        container.destroy();
      }
      container = view = null;
    });
    run.cancelTimers();
  }
});

function createGroupedView(template, context) {
  var options = {
    container: container,
    context: context,
    template: compile(template),
    templateData: {insideGroup: true, keywords: {}}
  };
  run(function() {
    view = EmberView.create(options);
  });
}

test("should properly modify behavior inside the block", function() {
  createGroupedView("{{msg}}", {msg: 'ohai'});
  appendView();

  equal(view.$().text(), 'ohai', 'Original value was rendered');

  run(function() {
    view.set('context.msg', 'ohbai');
  });
  equal(view.$().text(), 'ohbai', 'Updated value was rendered');

  run(function() {
    view.set('context.msg', null);
  });
  equal(view.$().text(), '', 'null value properly rendered as a blank');

  run(function() {
    view.set('context.msg', undefined);
  });
  equal(view.$().text(), '', 'undefined value properly rendered as a blank');
});

test("property changes inside views should only rerender their view", function() {
  createGroupedView(
    '{{#view}}{{msg}}{{/view}}',
    {msg: 'ohai'}
  );
  var rerenderWasCalled = false;
  view.reopen({
    rerender: function() { rerenderWasCalled = true; this._super(); }
  });
  appendView();
  equal(trim(view.$().text()), 'ohai', 'Original value was rendered');

  run(function() {
    view.set('context.msg', 'ohbai');
  });
  ok(!rerenderWasCalled, "The GroupView rerender method was not called");
  equal(trim(view.$().text()), 'ohbai', "The updated value was rendered");
});

test("should work with bind-attr", function() {
  createGroupedView(
    '<button {{bind-attr class="innerClass"}}>ohai</button>',
    {innerClass: 'magic'}
  );
  appendView();
  equal(view.$('.magic').length, 1);

  run(function() {
    view.set('context.innerClass', 'bindings');
  });
  equal(view.$('.bindings').length, 1);

  run(function() {
    view.rerender();
  });
  equal(view.$('.bindings').length, 1);
});

test("should work with the #if helper", function() {
  createGroupedView(
    '{{#if something}}hooray{{else}}boo{{/if}}',
    {something: true}
  );
  appendView();

  equal(trim(view.$().text()), 'hooray', 'Truthy text was rendered');

  run(function() {
    view.set('context.something', false);
  });
  equal(trim(view.$().text()), 'boo', "The falsy value was rendered");
});

test("#each with no content", function() {
  expect(0);
  createGroupedView(
    "{{#each item in missing}}{{item}}{{/each}}"
  );
  appendView();
});

test("#each's content can be changed right before a destroy", function() {
  expect(0);

  createGroupedView(
    "{{#each number in numbers}}{{number}}{{/each}}",
    {numbers: A([1,2,3])}
  );
  appendView();

  run(function() {
    view.set('context.numbers', A([3,2,1]));
    view.destroy();
  });
});

test("#each can be nested", function() {
  createGroupedView(
    "{{#each number in numbers}}{{number}}{{/each}}",
    {numbers: A([1, 2, 3])}
  );
  appendView();
  equal(view.$().text(), '123', "The content was rendered");

  run(function() {
    view.get('context.numbers').pushObject(4);
  });

  equal(view.$().text(), '1234', "The array observer properly updated the rendered output");

  run(function() {
    view.set('context.numbers', A(['a', 'b', 'c']));
  });

  equal(view.$().text(), 'abc', "Replacing the array properly updated the rendered output");
});

test("#each can be used with an ArrayProxy", function() {
  createGroupedView(
    "{{#each number in numbers}}{{number}}{{/each}}",
    {numbers: ArrayProxy.create({content: A([1, 2, 3])})}
  );
  appendView();
  equal(view.$().text(), '123', "The content was rendered");
});

test("should allow `#each item in array` format", function() {
  var yehuda = {name: 'Yehuda'};
  createGroupedView(
    '{{#each person in people}}{{person.name}}{{/each}}',
    {people: A([yehuda, {name: 'Tom'}])}
  );
  appendView();
  equal(view.$().text(), 'YehudaTom', "The content was rendered");

  run(function() {
    set(yehuda, 'name', 'Erik');
  });
  equal(view.$().text(), 'ErikTom', "The updated object value was rendered");

  run(function() {
    view.get('context.people').pushObject({name: 'Alex'});
    view.get('context.people').removeObject(yehuda);
  });
  equal(view.$().text(), 'TomAlex', "The updated array content was rendered");

  run(function() {
    view.set('context.people', A([{name: 'Sarah'},{name: 'Gavin'}]));
  });
  equal(view.$().text(), 'SarahGavin', "The replaced array content was rendered");
});

test("an #each can be nested with a view inside", function() {
  var yehuda = {name: 'Yehuda'};
  createGroupedView(
    '{{#each person in people}}{{#view}}{{person.name}}{{/view}}{{/each}}',
    {people: A([yehuda, {name: 'Tom'}])}
  );
  appendView();
  equal(view.$().text(), 'YehudaTom', "The content was rendered");

  run(function() {
    set(yehuda, 'name', 'Erik');
  });

  equal(view.$().text(), 'ErikTom', "The updated object's view was rerendered");
});

test("an #each can be nested with a component inside", function() {
  var yehuda = {name: 'Yehuda'};
  container.register('view:test', Component.extend());
  createGroupedView(
    '{{#each person in people}}{{#view "test"}}{{person.name}}{{/view}}{{/each}}',
    {people: A([yehuda, {name: 'Tom'}])}
  );

  appendView();
  equal(view.$().text(), 'YehudaTom', "The content was rendered");

  run(function() {
    set(yehuda, 'name', 'Erik');
  });

  equal(view.$().text(), 'ErikTom', "The updated object's view was rerendered");
});

test("#each with groupedRows=true behaves like a normal bound #each", function() {
  createGroupedView(
    '{{#each number in numbers groupedRows=true}}{{number}}{{/each}}',
    {numbers: A([1, 2, 3])}
  );
  appendView();
  equal(view.$().text(), '123');

  run(function() {
    view.get('context.numbers').pushObject(4);
  });

  equal(view.$().text(), '1234');
});

test("#each with itemViewClass behaves like a normal bound #each", function() {
  container.register('view:nothing-special-view', Ember.View);
  createGroupedView(
    '{{#each person in people itemViewClass="nothing-special-view"}}{{person.name}}{{/each}}',
    {people: A([{name: 'Erik'}, {name: 'Peter'}])}
  );
  appendView();
  equal(view.$('.ember-view').length, 2, "Correct number of views are output");
  equal(view.$().text(), 'ErikPeter');

  run(function() {
    view.get('context.people').pushObject({name: 'Tom'});
  });

  equal(view.$('.ember-view').length, 3, "Correct number of views are output");
  // IE likes to add newlines
  equal(trim(view.$().text()), 'ErikPeterTom');
});

test("should escape HTML in normal mustaches", function() {
  createGroupedView(
    '{{msg}}', {msg: 'you need to be more <b>bold</b>'}
  );
  appendView();
  equal(view.$('b').length, 0, "does not create an element");
  equal(view.$().text(), 'you need to be more <b>bold</b>', "inserts entities, not elements");
});

test("should not escape HTML in triple mustaches", function() {
  createGroupedView(
    '{{{msg}}}', {msg: 'you need to be more <b>bold</b>'}
  );
  appendView();
  equal(view.$('b').length, 1, "creates an element");
});
