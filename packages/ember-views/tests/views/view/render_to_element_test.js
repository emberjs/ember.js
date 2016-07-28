import { get } from 'ember-metal/property_get';
import run from 'ember-metal/run_loop';
import EmberView from 'ember-views/views/view';

import { test, testModule } from 'internal-test-helpers/tests/skip-if-glimmer';
import require from 'require';

let View, view, compile;

testModule('EmberView - renderToElement()', {
  setup() {
    compile = compile || require('ember-htmlbars-template-compiler').compile;
    View = EmberView.extend({
      template: compile('<h1>hello world</h1> goodbye world')
    });
  },

  teardown() {
    run(() => {
      if (!view.isDestroyed) { view.destroy(); }
    });
  }
});

test('should render into and return a body element', function() {
  view = View.create();

  ok(!get(view, 'element'), 'precond - should not have an element');

  let element = run(() => view.renderToElement());

  equal(element.tagName, 'BODY', 'returns a body element');
  equal(element.firstChild.tagName, 'DIV', 'renders the view div');
  equal(element.firstChild.firstChild.tagName, 'H1', 'renders the view div');
  equal(element.firstChild.firstChild.nextSibling.nodeValue, ' goodbye world', 'renders the text node');
});

test('should create and render into an element with a provided tagName', function() {
  view = View.create();

  ok(!get(view, 'element'), 'precond - should not have an element');

  let element = run(() => view.renderToElement('div'));

  equal(element.tagName, 'DIV', 'returns a body element');
  equal(element.firstChild.tagName, 'DIV', 'renders the view div');
  equal(element.firstChild.firstChild.tagName, 'H1', 'renders the view div');
  equal(element.firstChild.firstChild.nextSibling.nodeValue, ' goodbye world', 'renders the text node');
});
