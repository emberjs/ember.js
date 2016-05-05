import EmberView from 'ember-views/views/view';
import run from 'ember-metal/run_loop';
import compile from 'ember-template-compiler/system/compile';
import { test, testModule } from 'ember-glimmer/tests/utils/skip-if-glimmer';

var view;

function appendView(view) {
  run(function() { view.appendTo('#qunit-fixture'); });
}

testModule('ember-htmlbars: value attribute', {
  teardown() {
    if (view) {
      run(view, view.destroy);
    }
  }
});

test('property is output', function() {
  view = EmberView.create({
    context: { name: 'rick' },
    template: compile('<input value={{name}}>')
  });
  appendView(view);

  equal(view.element.firstChild.tagName, 'INPUT', 'input element is created');
  equal(view.element.firstChild.value, 'rick',
        'property is set true');
});

test('string property is output', function() {
  view = EmberView.create({
    context: { name: 'rick' },
    template: compile('<input value=\'{{name}}\'>')
  });
  appendView(view);

  equal(view.element.firstChild.tagName, 'INPUT', 'input element is created');
  equal(view.element.firstChild.value, 'rick',
        'property is set true');
});

test('blank property is output', function() {
  view = EmberView.create({
    context: { name: '' },
    template: compile('<input value={{name}}>')
  });
  appendView(view);

  equal(view.element.firstChild.tagName, 'INPUT', 'input element is created');
  equal(view.element.firstChild.value, '',
        'property is set true');
});
