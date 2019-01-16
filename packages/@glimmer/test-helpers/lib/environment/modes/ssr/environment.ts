import { GlimmerTreeChanges, GlimmerTreeConstruction } from '@glimmer/interfaces';
import createHTMLDocument from '@simple-dom/document';
import { SimpleDocument } from '@simple-dom/interface';
import { assertElement, toInnerHTML } from '../../../dom';
import RenderDelegate from '../../../render-delegate';
import { RenderTest } from '../../../render-test';
import EagerRenderDelegate from '../eager/render-delegate';
import LazyRenderDelegate from '../lazy/render-delegate';

export interface NodeEnvironmentOptions {
  document: SimpleDocument;
  appendOperations?: GlimmerTreeConstruction;
  updateOperations?: GlimmerTreeChanges;
}

export class NodeLazyRenderDelegate extends LazyRenderDelegate {
  constructor() {
    super(createHTMLDocument());
  }
}

export class NodeEagerRenderDelegate extends EagerRenderDelegate {
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

export class NodeRenderDelegate extends EagerRenderDelegate {
  constructor(doc: SimpleDocument = createHTMLDocument()) {
    super(doc);
  }
}
