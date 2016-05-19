import EmberView from 'ember-views/views/view';
import run from 'ember-metal/run_loop';
import { compile } from '../utils/helpers';
import { equalInnerHTML } from 'htmlbars-test-helpers';
import { test, testModule } from 'ember-glimmer/tests/utils/skip-if-glimmer';

var view;

function appendView(view) {
  run(function() { view.appendTo('#qunit-fixture'); });
}

testModule('ember-htmlbars: href attribute', {
  teardown() {
    if (view) {
      run(view, view.destroy);
    }
  }
});

test('href is set', function() {
  view = EmberView.create({
    context: { url: 'http://example.com' },
    template: compile('<a href={{url}}></a>')
  });
  appendView(view);

  equalInnerHTML(view.element, '<a href="http://example.com"></a>',
                 'attribute is output');
});
