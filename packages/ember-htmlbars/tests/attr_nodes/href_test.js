import isEnabled from 'ember-metal/features';
import EmberView from 'ember-views/views/view';
import run from 'ember-metal/run_loop';
import compile from 'ember-template-compiler/system/compile';
import { equalInnerHTML } from 'htmlbars-test-helpers';

var view;

function appendView(view) {
  run(function() { view.appendTo('#qunit-fixture'); });
}

QUnit.module('ember-htmlbars: href attribute', {
  teardown() {
    if (view) {
      run(view, view.destroy);
    }
  }
});

QUnit.test('href is set', function() {
  view = EmberView.create({
    context: { url: 'http://example.com' },
    template: compile('<a href={{url}}></a>')
  });
  appendView(view);

  equalInnerHTML(view.element, '<a href="http://example.com"></a>',
                 'attribute is output');
});
