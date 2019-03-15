import { GlimmerTreeChanges, GlimmerTreeConstruction } from '@glimmer/interfaces';
import createHTMLDocument from '@simple-dom/document';
import { SimpleDocument } from '@simple-dom/interface';
import { JitRenderDelegate } from '../jit/delegate';
import { AotRenderDelegate } from '../aot/delegate';
import { RenderTest } from '../../render-test';
import RenderDelegate from '../../render-delegate';
import { toInnerHTML, assertElement } from '../../dom/simple-utils';

export interface NodeEnvironmentOptions {
  document: SimpleDocument;
  appendOperations?: GlimmerTreeConstruction;
  updateOperations?: GlimmerTreeChanges;
}

export class NodeJitRenderDelegate extends JitRenderDelegate {
  static style = 'node jit';

  constructor() {
    super(createHTMLDocument());
  }
}

export class NodeAotRenderDelegate extends AotRenderDelegate {
  static style = 'node aot';

  constructor() {
    super(createHTMLDocument());
  }
}

export class AbstractNodeTest extends RenderTest {
  constructor(delegate: RenderDelegate) {
    super(delegate);
  }

  assertHTML(html: string) {
    let serialized = toInnerHTML(this.element);
    this.assert.equal(serialized, html);
  }

  assertComponent(html: string) {
    let el = assertElement(this.element.firstChild);

    if (this.testType !== 'Glimmer') {
      this.assert.equal(el.getAttribute('class'), 'ember-view');
      this.assert.ok(el.getAttribute('id'));
      this.assert.ok(el.getAttribute('id')!.indexOf('ember') > -1);
    }

    let serialized = toInnerHTML(el);
    this.assert.equal(serialized, html);
  }
}

export class NodeRenderDelegate extends AotRenderDelegate {
  constructor(doc: SimpleDocument = createHTMLDocument()) {
    super(doc);
  }
}
