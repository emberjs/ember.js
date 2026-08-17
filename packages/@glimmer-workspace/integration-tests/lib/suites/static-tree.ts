import { LOCAL_DEBUG } from '@glimmer/local-debug-flags';
import { beginTestSteps, endTestSteps, verifySteps } from '@glimmer/util';

import { RenderTest } from '../render-test';
import { test } from '../test-decorator';

export class StaticTreeSuite extends RenderTest {
  static suiteName = 'static trees';

  beforeEach() {
    if (LOCAL_DEBUG) {
      beginTestSteps?.();
    }
  }

  afterEach() {
    if (LOCAL_DEBUG) {
      endTestSteps?.();
    }
  }

  @test
  'a static subtree is built once, then cloned'() {
    // Cloning is invisible in the output, so the step log is the only way to
    // assert the optimization runs.
    if (!LOCAL_DEBUG) return;

    this.render('{{#each this.rows key="@index" as |row|}}<p><i>{{row}}</i></p>{{/each}}', {
      rows: ['a', 'b', 'c'],
    });

    this.assertHTML('<p><i>a</i></p><p><i>b</i></p><p><i>c</i></p>');
    verifySteps?.(
      'static-trees',
      [
        ['build', 'p'],
        ['clone', 'p'],
        ['clone', 'p'],
      ],
      'the first row builds the tree, the rest clone it'
    );
  }

  @test
  'a cloned subtree gets its own dynamic values'() {
    this.render(
      '{{#each this.rows key="@index" as |row|}}<p class={{row.cls}}><i>{{row.text}}</i></p>{{/each}}',
      {
        rows: [
          { cls: 'x', text: '1' },
          { cls: 'y', text: '2' },
        ],
      }
    );

    this.assertHTML('<p class="x"><i>1</i></p><p class="y"><i>2</i></p>');
    this.assertStableRerender();
  }

  @test
  'a subtree containing a component is not extracted'() {
    if (!LOCAL_DEBUG) return;

    this.registerComponent('TemplateOnly', 'Inner', '<i>inner</i>');
    this.render('{{#each this.rows key="@index" as |row|}}<p><Inner />{{row}}</p>{{/each}}', {
      rows: ['a', 'b'],
    });

    this.assertHTML('<p><i>inner</i>a</p><p><i>inner</i>b</p>');
    verifySteps?.('static-trees', [], 'a component ends the run');
  }

  @test
  'a single element is below the extraction threshold'() {
    if (!LOCAL_DEBUG) return;

    this.render('{{#each this.rows key="@index" as |row|}}<p>{{row}}</p>{{/each}}', {
      rows: ['a', 'b'],
    });

    this.assertHTML('<p>a</p><p>b</p>');
    verifySteps?.('static-trees', [], 'one element is not worth cloning');
  }

  @test
  'namespaced elements survive cloning'() {
    this.render(
      '{{#each this.rows key="@index" as |row|}}<svg viewBox="0 0 1 1"><circle r={{row}} /></svg>{{/each}}',
      { rows: ['1', '2'] }
    );

    this.assertHTML(
      '<svg viewBox="0 0 1 1"><circle r="1"></circle></svg>' +
        '<svg viewBox="0 0 1 1"><circle r="2"></circle></svg>'
    );
  }
}
