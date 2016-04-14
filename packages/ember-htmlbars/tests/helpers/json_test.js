import EmberView from 'ember-views/views/view';
import compile from 'ember-template-compiler/system/compile';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';

function buildView(template, context = {}) {
  return EmberView.create({
    template: compile(template),
    context
  });
}

QUnit.test('let the original value through by default', function() {
  var view = buildView('{{json "Hiya buddy!"}}');
  runAppend(view);

  equal(view.$().text(), 'Hiya buddy!');

  runDestroy(view);
});

QUnit.test('show the json value when there is a corresponding function', function() {
  var context = {
    user: {
      toJSON: function() {
        return { name: 'My Name' };
      }
    }
  };

  var view = buildView('{{json user}}', context);
  runAppend(view);

  equal(view.$().text(), '{\"name\":\"My Name\"}');

  runDestroy(view);
});
