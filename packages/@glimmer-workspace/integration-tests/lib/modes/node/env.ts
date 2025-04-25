import type {
  GlimmerTreeChanges,
  GlimmerTreeConstruction,
  SimpleDocument,
} from '@glimmer/interfaces';
import createHTMLDocument from '@simple-dom/document';

import type RenderDelegate from '../../render-delegate';
import type { RenderDelegateOptions } from '../../render-delegate';

import { assertingElement, toInnerHTML } from '../../dom/simple-utils';
import { RenderTest } from '../../render-test';
import { JitRenderDelegate } from '../jit/delegate';

export interface NodeEnvironmentOptions {
  document: SimpleDocument;
  appendOperations?: GlimmerTreeConstruction;
  updateOperations?: GlimmerTreeChanges;
}

export class NodeJitRenderDelegate extends JitRenderDelegate {
  static override style = 'node jit';

  constructor(options: RenderDelegateOptions = {}) {
    options.doc = options.doc || createHTMLDocument();
    super(options);
  }
}

export class AbstractNodeTest extends RenderTest {
  constructor(delegate: RenderDelegate) {
    super(delegate);
  }

  override assertHTML(html: string) {
    let serialized = toInnerHTML(this.element);
    this.assert.strictEqual(serialized, html);
  }

  override assertComponent(html: string) {
    let el = assertingElement(this.element.firstChild);

    if (this.testType !== 'Glimmer') {
      this.assert.strictEqual(el.getAttribute('class'), 'ember-view');
      this.assert.ok(el.getAttribute('id'));
      this.assert.ok(el.getAttribute('id')!.indexOf('ember') > -1);
    }

    let serialized = toInnerHTML(el);
    this.assert.strictEqual(serialized, html);
  }
}
