import {
  PartialRehydrationDelegate,
  test,
  RenderTest,
  suite,
  content,
  OPEN,
  CLOSE,
  replaceHTML,
  qunitFixture,
} from '..';
import { castToSimple } from '@glimmer/util';

export class PartialRehydrationTest extends RenderTest {
  static suiteName = 'partial rehydration';
  delegate!: PartialRehydrationDelegate;

  @test
  'can rehydrate from non starting blocks'() {
    this.delegate.registerBasicComponent('RehydratingComponent', '{{@a}}{{@b}}{{@c}}');

    this.delegate.registerBasicComponent(
      'Root',
      '<div id="placeholder"><RehydratingComponent @a={{@a}} @b={{@b}} @c={{@c}}/></div>'
    );

    const args = {
      a: 'a',
      b: 'b',
      c: 'c',
    };

    const html = this.delegate.renderComponentServerSide('Root', args);
    this.assert.equal(
      html,
      content([
        OPEN,
        OPEN,
        '<div id="placeholder">',
        OPEN,
        OPEN,
        'a',
        CLOSE,
        OPEN,
        'b',
        CLOSE,
        OPEN,
        'c',
        CLOSE,
        CLOSE,
        '</div>',
        CLOSE,
        CLOSE,
      ]),
      'Expect server output to match'
    );

    replaceHTML(qunitFixture(), html);

    this.element = castToSimple(document.getElementById('placeholder')!);
    this.renderResult = this.delegate.renderComponentClientSide(
      'RehydratingComponent',
      args,
      this.element
    );
    this.element = qunitFixture();
    this.assertHTML(content([OPEN, OPEN, '<div id="placeholder">abc</div>', CLOSE, CLOSE]));
    this.assert.ok(
      this.delegate.rehydrationStats.clearedNodes.length === 0,
      'No nodes were cleared'
    );
    this.assertStableNodes();
    this.assertStableRerender();
  }
}

suite(PartialRehydrationTest, PartialRehydrationDelegate);
