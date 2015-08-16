import Component from 'ember-views/components/component';
import compile from 'ember-template-compiler/system/compile';
import run from 'ember-metal/run_loop';

import { runAppend, runDestroy } from 'ember-runtime/tests/utils';

var component;

QUnit.module('ember-htmlbars: {{#each-in}} helper', {
  teardown() {
    if (component) { runDestroy(component); }
  }
});

function renderTemplate(_template, props) {
  let template = compile(_template);

  component = Component.create(props, {
    layout: template
  });

  runAppend(component);
}

QUnit.test('it renders the template for each item in a hash', function(assert) {
  let categories = {
    'Smartphones': 8203,
    'JavaScript Frameworks': Infinity
  };

  renderTemplate(`
      <ul class="categories">
      {{#each-in categories as |category count|}}
        <li>{{category}}: {{count}}</li>
      {{/each-in}}
      </ul>
    `, { categories });

  assert.equal(component.$('li').length, 2, 'renders 2 lis');
  assert.equal(component.$('li').first().text(),
               'Smartphones: 8203', 'renders first item correctly');
  assert.equal(component.$('li:eq(1)').text(),
               'JavaScript Frameworks: Infinity', 'renders second item correctly');

  run(function() {
    component.rerender();
  });

  assert.equal(component.$('li').length, 2, 'renders 2 lis after rerender');
  assert.equal(component.$('li').first().text(),
               'Smartphones: 8203', 'renders first item correctly after rerender');
  assert.equal(component.$('li:eq(1)').text(),
               'JavaScript Frameworks: Infinity', 'renders second item correctly after rerender');

  run(function() {
    component.set('categories', {
      'Smartphones': 100
    });
  });

  assert.equal(component.$('li').length, 1, 'removes unused item after data changes');
  assert.equal(component.$('li').first().text(),
               'Smartphones: 100', 'correctly updates item after data changes');

  run(function() {
    component.set('categories', {
      'Programming Languages': 199303,
      'Good Programming Languages': 123,
      'Bad Programming Languages': 456
    });
  });

  assert.equal(component.$('li').length, 3, 'renders 3 lis after updating data');
  assert.equal(component.$('li').first().text(),
               'Programming Languages: 199303', 'renders first item correctly after rerender');
  assert.equal(component.$('li:eq(1)').text(),
               'Good Programming Languages: 123', 'renders second item correctly after rerender');
  assert.equal(component.$('li:eq(2)').text(),
               'Bad Programming Languages: 456', 'renders third item correctly after rerender');
});

QUnit.test('it only iterates over an object\'s own properties', function(assert) {
  let protoCategories = {
    'Smartphones': 8203,
    'JavaScript Frameworks': Infinity
  };

  let categories = Object.create(protoCategories);
  categories['Televisions'] = 183;
  categories['Alarm Clocks'] = 999;

  renderTemplate(`
      <ul class="categories">
      {{#each-in categories as |category count|}}
        <li>{{category}}: {{count}}</li>
      {{/each-in}}
      </ul>
    `, { categories });

  assert.equal(component.$('li').length, 2, 'renders 2 lis');
  assert.equal(component.$('li').first().text(),
               'Televisions: 183', 'renders first item correctly');
  assert.equal(component.$('li:eq(1)').text(),
               'Alarm Clocks: 999', 'renders second item correctly');

  run(() => component.rerender());

  assert.equal(component.$('li').length, 2, 'renders 2 lis after rerender');
  assert.equal(component.$('li').first().text(),
               'Televisions: 183', 'renders first item correctly after rerender');
  assert.equal(component.$('li:eq(1)').text(),
               'Alarm Clocks: 999', 'renders second item correctly after rerender');
});

QUnit.test('it emits nothing if the passed argument is not an object', function(assert) {
  let categories = null;

  renderTemplate(`
      <ul class="categories">
      {{#each-in categories as |category count|}}
        <li>{{category}}: {{count}}</li>
      {{/each-in}}
      </ul>
    `, { categories });

  assert.equal(component.$('li').length, 0, 'nothing is rendered if the object is not passed');

  run(() => component.rerender());
  assert.equal(component.$('li').length, 0, 'nothing is rendered if the object is not passed after rerender');
});

QUnit.test('it supports rendering an inverse', function(assert) {
  let categories = null;

  renderTemplate(`
      <ul class="categories">
      {{#each-in categories as |category count|}}
        <li>{{category}}: {{count}}</li>
      {{else}}
        <li>No categories.</li>
      {{/each-in}}
      </ul>
    `, { categories });

  assert.equal(component.$('li').length, 1, 'one li is rendered');
  assert.equal(component.$('li').text(), 'No categories.', 'the inverse is rendered');

  run(() => component.rerender());
  assert.equal(component.$('li').length, 1, 'one li is rendered');
  assert.equal(component.$('li').text(), 'No categories.', 'the inverse is rendered');

  run(() => {
    component.set('categories', {
      'First Category': 123
    });
  });

  assert.equal(component.$('li').length, 1, 'one li is rendered');
  assert.equal(component.$('li').text(), 'First Category: 123', 'the list is rendered after being set');

  run(() => {
    component.set('categories', null);
  });

  assert.equal(component.$('li').length, 1, 'one li is rendered');
  assert.equal(component.$('li').text(), 'No categories.', 'the inverse is rendered when the value becomes falsey again');
});
